-- MenuFlow 0002: production-readiness fixes. Run AFTER 0001_schema.sql. Safe to run on a live database.

-- 1) A fresh production database has NO settings row (the demo seed must never run there), which made the
--    public menu fail. Create a placeholder row; edit it in Table Editor > restaurant_settings.
insert into restaurant_settings(name, description)
values ('My Restaurant', 'Welcome! Edit this text in Supabase: Table Editor > restaurant_settings.')
on conflict (id) do nothing;

-- 2) Spam throttle lookup.
create index if not exists orders_phone_created_idx on orders(customer_phone, created_at desc);

-- 3) create_order, hardened:
--    * advisory lock per idempotency key: two simultaneous submissions of the same order can no longer race
--      into a unique-violation error; the second one waits and returns the first order's reference.
--    * max 5 orders per phone number per 10 minutes (TOO_MANY_ORDERS).
create or replace function create_order(
  p_idempotency_key text, p_token_hash text, p_customer_name text, p_customer_phone text,
  p_customer_email text, p_fulfillment fulfillment_method, p_table_number text,
  p_delivery_address text, p_note text, p_items jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  s restaurant_settings%rowtype;
  existing text; new_id uuid := gen_random_uuid(); ref text;
  entry jsonb; item menu_items%rowtype; qty int; extras numeric(12,2); unit numeric(12,2);
  opts jsonb; opt_count int; opt_ids uuid[]; sub numeric(12,2) := 0; fee numeric(12,2) := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select reference into existing from orders where idempotency_key = p_idempotency_key;
  if existing is not null then return existing; end if;

  select * into s from restaurant_settings;
  if not found then raise exception 'RESTAURANT_NOT_ACCEPTING'; end if;
  if not s.accepting_orders then raise exception 'RESTAURANT_NOT_ACCEPTING'; end if;
  if not (p_fulfillment = any(s.enabled_fulfillment)) then raise exception 'FULFILLMENT_DISABLED'; end if;
  if p_fulfillment = 'delivery' then
    if not s.delivery_enabled then raise exception 'FULFILLMENT_DISABLED'; end if;
    if coalesce(btrim(p_delivery_address),'') = '' then raise exception 'ADDRESS_REQUIRED'; end if;
    fee := s.delivery_fee;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'INVALID_ITEMS'; end if;

  if (select count(*) from orders
        where customer_phone = btrim(p_customer_phone) and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  ref := 'MF-' || nextval('order_reference_seq');
  insert into orders(id, reference, tracking_token_hash, idempotency_key, customer_name, customer_phone,
    customer_email, fulfillment, table_number, delivery_address, note, subtotal, delivery_fee, total, currency_code)
  values (new_id, ref, p_token_hash, p_idempotency_key, btrim(p_customer_name), btrim(p_customer_phone),
    nullif(btrim(p_customer_email),''), p_fulfillment, nullif(btrim(p_table_number),''),
    nullif(btrim(p_delivery_address),''), nullif(btrim(p_note),''), 0, fee, fee, s.currency_code);

  for entry in select * from jsonb_array_elements(p_items) loop
    qty := (entry->>'quantity')::int;
    if qty is null or qty not between 1 and 99 then raise exception 'INVALID_QUANTITY'; end if;

    select i.* into item from menu_items i join menu_categories c on c.id = i.category_id
    where i.id = (entry->>'menu_item_id')::uuid and i.is_published and i.is_available
      and i.archived_at is null and c.is_published and c.archived_at is null;
    if not found then raise exception 'ITEM_UNAVAILABLE'; end if;

    select coalesce(array_agg(x::uuid), '{}') into opt_ids
      from jsonb_array_elements_text(coalesce(entry->'option_ids','[]'::jsonb)) x;
    select coalesce(sum(extra_price),0), count(*),
           coalesce(jsonb_agg(jsonb_build_object('group',group_name,'name',name,'extra_price',extra_price)),'[]')
      into extras, opt_count, opts
      from menu_item_options where id = any(opt_ids) and menu_item_id = item.id and is_available;
    if opt_count <> cardinality(opt_ids) then raise exception 'INVALID_OPTION'; end if;

    unit := item.price + extras;
    insert into order_items(order_id, menu_item_id, item_name, unit_price, quantity, selected_options, instructions, line_total)
    values (new_id, item.id, item.name, unit, qty, opts, nullif(left(entry->>'instructions',300),''), unit * qty);
    sub := sub + unit * qty;
  end loop;

  update orders set subtotal = sub, total = sub + fee where id = new_id;
  insert into order_status_events(order_id, status) values (new_id, 'pending');
  return ref;
end $$;
revoke all on function create_order from public, anon, authenticated;
grant execute on function create_order to service_role;
