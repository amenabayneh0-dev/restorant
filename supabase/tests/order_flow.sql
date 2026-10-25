-- Database test suite. Run with: npm run test:db  (needs a local PostgreSQL; see scripts/test-db.sh)
-- Every check raises an exception on failure, so a clean run means everything passed.
\set ON_ERROR_STOP on
\o /dev/null
create temp table _log(msg text);
create function pg_temp.ok(cond boolean, name text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAILED: %', name; end if; insert into _log values (name); end $$;
create function pg_temp.raises(code text, sql text, name text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || code || '%' then insert into _log values (name); return; end if;
    raise exception 'FAILED: % (expected %, got %)', name, code, sqlerrm;
  end;
  raise exception 'FAILED: % (expected % but statement succeeded)', name, code;
end $$;

-- ---------- fixtures ----------
select pg_temp.ok((select count(*) from restaurant_settings) = 1, 'settings row exists');
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-0000000000a1','admin@x'), ('00000000-0000-0000-0000-0000000000c1','counter@x'),
  ('00000000-0000-0000-0000-0000000000b1','kitchen@x'), ('00000000-0000-0000-0000-0000000000d1','nobody@x');
insert into staff_profiles(user_id, display_name, role) values
  ('00000000-0000-0000-0000-0000000000a1','A','admin'), ('00000000-0000-0000-0000-0000000000c1','C','counter'),
  ('00000000-0000-0000-0000-0000000000b1','K','kitchen');

create function pg_temp.item(s text) returns uuid language sql as $$ select id from menu_items where slug = s $$;
create function pg_temp.lines(s text, q int default 1, opts jsonb default '[]') returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('menu_item_id', pg_temp.item(s), 'quantity', q, 'option_ids', opts)) $$;
create function pg_temp.mk(k text, ph text, f fulfillment_method, addr text, items jsonb) returns text language sql as $$
  select create_order(k, 'hash-'||k, 'Test', ph, null, f, case when f='dine_in' then '4' end, addr, null, items) $$;

-- ---------- pricing, idempotency ----------
select pg_temp.ok(pg_temp.mk('k1','+251911000001','pickup',null, pg_temp.lines('fresh-mango-juice',2)) like 'MF-%', 'order placed');
select pg_temp.ok((select subtotal from orders where idempotency_key='k1') = 180, 'server-side price: 2 x 90 = 180');
select pg_temp.ok(pg_temp.mk('k1','+251911000001','pickup',null,'[]') = (select reference from orders where idempotency_key='k1'), 'same key returns same order');
select pg_temp.ok((select count(*) from orders) = 1, 'idempotent: still exactly one order');

select pg_temp.mk('k2','+251911000002','delivery','Bole 1',
  pg_temp.lines('grilled-chicken-plate',1,(select jsonb_agg(id) from menu_item_options where name='Side salad')));
select pg_temp.ok((select total from orders where idempotency_key='k2') = 410, 'delivery: 320 + 40 side salad + 50 fee = 410');
select pg_temp.ok((select count(*) from order_status_events) = 2, 'one status event per order');

-- ---------- validation ----------
select pg_temp.raises('ADDRESS_REQUIRED', $q$select pg_temp.mk('k3','+251911000003','delivery',null,pg_temp.lines('fresh-mango-juice'))$q$, 'delivery needs address');
select pg_temp.raises('INVALID_OPTION', $q$select pg_temp.mk('k4','+251911000004','pickup',null,pg_temp.lines('fresh-mango-juice',1,jsonb_build_array(gen_random_uuid())))$q$, 'unknown option rejected');
select pg_temp.raises('INVALID_OPTION', $q$select pg_temp.mk('k5','+251911000005','pickup',null,pg_temp.lines('fresh-mango-juice',1,(select jsonb_agg(id) from menu_item_options where name='Extra cheese')))$q$, 'option of another item rejected');
select pg_temp.raises('INVALID_QUANTITY', $q$select pg_temp.mk('k6','+251911000006','pickup',null,pg_temp.lines('fresh-mango-juice',0))$q$, 'quantity 0 rejected');
select pg_temp.raises('INVALID_ITEMS', $q$select pg_temp.mk('k7','+251911000007','pickup',null,'[]')$q$, 'empty cart rejected');
select pg_temp.raises('ITEM_UNAVAILABLE', $q$select pg_temp.mk('k8','+251911000008','pickup',null,jsonb_build_array(jsonb_build_object('menu_item_id',gen_random_uuid(),'quantity',1)))$q$, 'unknown item rejected');
update menu_items set is_available = false where slug = 'honey-cake';
select pg_temp.raises('ITEM_UNAVAILABLE', $q$select pg_temp.mk('k9','+251911000009','pickup',null,pg_temp.lines('honey-cake'))$q$, 'sold-out item rejected');
update menu_items set is_available = true where slug = 'honey-cake';
select pg_temp.ok((select count(*) from orders) = 2, 'failed orders leave nothing behind (atomic)');
select pg_temp.ok((select count(*) from order_items) = 2, 'no orphan order lines');

-- ---------- throttle ----------
select pg_temp.mk('t'||g,'+251911999999','pickup',null,pg_temp.lines('fresh-mango-juice')) from generate_series(1,5) g;
select pg_temp.raises('TOO_MANY_ORDERS', $q$select pg_temp.mk('t6','+251911999999','pickup',null,pg_temp.lines('fresh-mango-juice'))$q$, 'phone throttle: 6th order in 10 min blocked');
select pg_temp.ok(pg_temp.mk('t1','+251911999999','pickup',null,'[]') like 'MF-%', 'throttle does not block a retry of an existing order');

-- ---------- restaurant closed ----------
update restaurant_settings set accepting_orders = false;
select pg_temp.raises('RESTAURANT_NOT_ACCEPTING', $q$select pg_temp.mk('c1','+251911000010','pickup',null,pg_temp.lines('fresh-mango-juice'))$q$, 'closed restaurant rejects orders');
update restaurant_settings set accepting_orders = true;

-- ---------- tracking ----------
select pg_temp.ok((get_order_tracking('hash-k1')->>'status') = 'pending', 'tracking by token hash works');
select pg_temp.ok(get_order_tracking('nope') is null, 'unknown token returns nothing');
select pg_temp.ok(not (get_order_tracking('hash-k1')::text like '%customer_phone%'), 'tracking exposes no phone number');

-- ---------- permissions ----------
create function pg_temp.as_user(uid text, rolename text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  perform set_config('request.jwt.claims', case when uid is null then '{}' else json_build_object('sub',uid)::text end, true);
  execute 'set local role ' || rolename;
end $$;
grant all on _log to public;
grant execute on all functions in schema pg_temp to public;

begin;
  select pg_temp.as_user(null,'anon');
  select pg_temp.ok((select count(*) from menu_items) >= 4, 'anon can read the published menu');
  select pg_temp.raises('permission denied', 'select * from orders', 'anon cannot read orders');
  select pg_temp.raises('permission denied', 'select * from staff_profiles', 'anon cannot read staff');
  select pg_temp.raises('permission denied', $q$select create_order('x','x','x','+251911000011',null,'pickup',null,null,null,'[]')$q$, 'anon cannot call create_order');
  select pg_temp.raises('permission denied', $q$select get_order_tracking('hash-k1')$q$, 'anon cannot call tracking lookup');
  select pg_temp.raises('permission denied', $q$update menu_items set price = 1$q$, 'anon cannot edit the menu');
rollback;

begin;
  select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1','authenticated');
  select pg_temp.raises('NOT_STAFF', $q$select change_order_status((select id from orders limit 1), 'accepted')$q$, 'non-staff user cannot change status');
  select pg_temp.ok((select count(*) from orders) = 0, 'non-staff user sees no orders (RLS)');
rollback;

create function pg_temp.oid(k text) returns uuid language sql as $$ select id from orders where idempotency_key = k $$;
begin;
  select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1','authenticated');
  select pg_temp.ok((select count(*) from orders) >= 2, 'kitchen can read orders');
  select pg_temp.raises('FORBIDDEN_TRANSITION', $q$select change_order_status(pg_temp.oid('k1'),'accepted')$q$, 'kitchen cannot accept');
  update menu_items set price = 1;  -- RLS filters this to 0 rows for non-admins
  select pg_temp.ok((select min(price) from menu_items) > 1, 'kitchen cannot edit menu prices');
rollback;

begin;
  select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1','authenticated');
  select change_order_status(pg_temp.oid('k1'),'accepted');
  select pg_temp.raises('FORBIDDEN_TRANSITION', $q$select change_order_status(pg_temp.oid('k1'),'completed')$q$, 'cannot skip steps');
  select pg_temp.raises('FORBIDDEN_TRANSITION', $q$select change_order_status(pg_temp.oid('k1'),'pending')$q$, 'cannot go backwards');
  select change_order_status(pg_temp.oid('k1'),'preparing');
  select change_order_status(pg_temp.oid('k1'),'ready');
  select change_order_status(pg_temp.oid('k1'),'completed');
  select pg_temp.raises('FORBIDDEN_TRANSITION', $q$select change_order_status(pg_temp.oid('k1'),'cancelled')$q$, 'completed order is final');
  select change_order_status(pg_temp.oid('k2'),'rejected');
  select pg_temp.ok((select count(*) from order_status_events where order_id = pg_temp.oid('k1')) = 5, 'every change is logged');
  update menu_items set price = 1;  -- silently blocked by RLS (0 rows) for non-admin
  select pg_temp.ok((select min(price) from menu_items) > 1, 'counter cannot edit menu prices');
commit;

begin;
  select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1','authenticated');
  update menu_items set is_available = false where slug = 'honey-cake';
  select pg_temp.ok((select is_available from menu_items where slug='honey-cake') = false, 'admin can mark an item sold out');
  update restaurant_settings set accepting_orders = false;
  select pg_temp.ok((select accepting_orders from restaurant_settings) = false, 'admin can pause orders');
  select pg_temp.raises('permission denied', $q$update staff_profiles set role = 'admin'$q$, 'nobody can edit staff roles via the API');
rollback;

\o
select count(*) || ' database checks passed' as result from _log;
