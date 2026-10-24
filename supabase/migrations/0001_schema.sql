-- MenuFlow schema: tables, constraints, indexes, RLS, and trusted order functions.
create type staff_role as enum ('admin','counter','kitchen');
create type order_status as enum ('pending','accepted','preparing','ready','completed','rejected','cancelled');
create type fulfillment_method as enum ('pickup','dine_in','delivery');

create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role staff_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton: the boolean primary key + check guarantees exactly one row.
create table restaurant_settings (
  id boolean primary key default true check (id),
  name text not null,
  description text not null default '',
  logo_url text,
  phone text, email text, address text,
  currency_code char(3) not null default 'ETB',
  timezone text not null default 'Africa/Addis_Ababa',
  opening_hours jsonb not null default '{}'::jsonb,
  accepting_orders boolean not null default true,
  enabled_fulfillment fulfillment_method[] not null default '{pickup,dine_in}',
  delivery_enabled boolean not null default false,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default false,   -- hidden vs public
  is_available boolean not null default true,    -- orderable vs "sold out"
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_category_idx on menu_items(category_id);
create index menu_items_public_idx on menu_items(is_published, is_available) where archived_at is null;

create table menu_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  group_name text not null,
  name text not null,
  extra_price numeric(12,2) not null default 0 check (extra_price >= 0),
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index menu_item_options_item_idx on menu_item_options(menu_item_id);

create sequence order_reference_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  tracking_token_hash text not null unique,      -- SHA-256 hex of the secret token; raw token is never stored
  idempotency_key text not null unique,          -- repeat submissions return the same order
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 5 and 30),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  fulfillment fulfillment_method not null,
  table_number text check (table_number is null or char_length(table_number) <= 20),
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 300),
  note text check (note is null or char_length(note) <= 500),
  status order_status not null default 'pending',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total = subtotal + delivery_fee),
  currency_code char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references auth.users(id) on delete set null,
  check (fulfillment <> 'delivery' or delivery_address is not null)
);
create index orders_created_idx on orders(created_at desc);
create index orders_status_created_idx on orders(status, created_at desc);

create table order_status_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_events_order_idx on order_status_events(order_id, created_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,   -- nullable: history survives
  item_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),        -- includes selected extras
  quantity int not null check (quantity between 1 and 99),
  selected_options jsonb not null default '[]'::jsonb,
  instructions text check (instructions is null or char_length(instructions) <= 300),
  line_total numeric(12,2) not null check (line_total = unit_price * quantity)
);
create index order_items_order_idx on order_items(order_id);

do $$ declare t text; begin
  foreach t in array array['staff_profiles','restaurant_settings','menu_categories','menu_items','orders'] loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ===== Authorization helpers =====
create function current_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff_profiles where user_id = auth.uid()
$$;
revoke all on function current_staff_role() from public;
grant execute on function current_staff_role() to anon, authenticated;

-- ===== Grants + RLS (grants and policies defined together) =====
alter table staff_profiles enable row level security;
alter table restaurant_settings enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_options enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- Public read: only what the public menu needs.
grant select on restaurant_settings, menu_categories, menu_items, menu_item_options to anon, authenticated;
create policy settings_public_read on restaurant_settings for select using (true);
create policy categories_public_read on menu_categories for select
  using ((is_published and archived_at is null) or current_staff_role() is not null);
create policy items_public_read on menu_items for select
  using ((is_published and archived_at is null) or current_staff_role() is not null);
create policy options_public_read on menu_item_options for select
  using (exists (select 1 from menu_items i where i.id = menu_item_id and i.is_published and i.archived_at is null)
         or current_staff_role() is not null);

-- Admin-only writes to menu and settings.
grant insert, update on menu_categories, menu_items to authenticated;
grant insert, update, delete on menu_item_options to authenticated;
grant update on restaurant_settings to authenticated;
create policy categories_admin_write on menu_categories for insert with check (current_staff_role() = 'admin');
create policy categories_admin_update on menu_categories for update using (current_staff_role() = 'admin') with check (current_staff_role() = 'admin');
create policy items_admin_write on menu_items for insert with check (current_staff_role() = 'admin');
create policy items_admin_update on menu_items for update using (current_staff_role() = 'admin') with check (current_staff_role() = 'admin');
create policy options_admin_write on menu_item_options for all using (current_staff_role() = 'admin') with check (current_staff_role() = 'admin');
create policy settings_admin_update on restaurant_settings for update using (current_staff_role() = 'admin') with check (current_staff_role() = 'admin');

-- Staff can read their own profile; admins read all. NO update policy: roles cannot be self-edited.
-- Role changes happen only via SQL editor / service role (see README).
grant select on staff_profiles to authenticated;
create policy profiles_read on staff_profiles for select using (user_id = auth.uid() or current_staff_role() = 'admin');

-- Orders: staff READ only. No direct insert/update/delete for anyone; writes go through functions below.
grant select on orders, order_items, order_status_events to authenticated;
create policy orders_staff_read on orders for select using (current_staff_role() is not null);
create policy order_items_staff_read on order_items for select using (current_staff_role() is not null);
create policy events_staff_read on order_status_events for select using (current_staff_role() is not null);

-- ===== Trusted public order creation =====
-- Called ONLY by the Next.js server (service role). Prices come from the database, never the client.
-- p_items: [{"menu_item_id":"uuid","quantity":2,"option_ids":["uuid"],"instructions":"text"}]
create function create_order(
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
  select reference into existing from orders where idempotency_key = p_idempotency_key;
  if existing is not null then return existing; end if;   -- duplicate submission: same order back

  select * into s from restaurant_settings;
  if not s.accepting_orders then raise exception 'RESTAURANT_NOT_ACCEPTING'; end if;
  if not (p_fulfillment = any(s.enabled_fulfillment)) then raise exception 'FULFILLMENT_DISABLED'; end if;
  if p_fulfillment = 'delivery' then
    if not s.delivery_enabled then raise exception 'FULFILLMENT_DISABLED'; end if;
    if coalesce(btrim(p_delivery_address),'') = '' then raise exception 'ADDRESS_REQUIRED'; end if;
    fee := s.delivery_fee;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'INVALID_ITEMS'; end if;

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
  return ref;   -- whole function is one transaction: any exception rolls everything back
end $$;
revoke all on function create_order from public, anon, authenticated;
grant execute on function create_order to service_role;

-- ===== Trusted tracking lookup: minimal data, by token hash only =====
create function get_order_tracking(p_token_hash text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reference', o.reference, 'status', o.status, 'fulfillment', o.fulfillment,
    'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'total', o.total,
    'currency_code', o.currency_code, 'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name',item_name,'quantity',quantity,
              'options',selected_options,'line_total',line_total)),'[]') from order_items where order_id = o.id),
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('status',status,'at',created_at) order by created_at),'[]')
                 from order_status_events where order_id = o.id))
  from orders o where o.tracking_token_hash = p_token_hash
$$;
revoke all on function get_order_tracking from public, anon, authenticated;
grant execute on function get_order_tracking to service_role;

-- ===== Role-aware status transitions (single source of truth) =====
create function change_order_status(p_order_id uuid, p_new order_status) returns void
language plpgsql security definer set search_path = public as $$
declare r staff_role := current_staff_role(); cur order_status; ok boolean;
begin
  if r is null then raise exception 'NOT_STAFF'; end if;
  select status into cur from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  ok := case
    when cur = 'pending'   and p_new in ('accepted','rejected') then r in ('admin','counter')
    when cur = 'accepted'  and p_new = 'preparing' then r in ('admin','kitchen','counter')
    when cur = 'preparing' and p_new = 'ready'     then r in ('admin','kitchen','counter')
    when cur = 'ready'     and p_new = 'completed' then r in ('admin','counter')
    when cur in ('accepted','preparing','ready') and p_new = 'cancelled' then r in ('admin','counter')
    else false end;
  if not ok then raise exception 'FORBIDDEN_TRANSITION'; end if;
  update orders set status = p_new, status_changed_at = now(), status_changed_by = auth.uid() where id = p_order_id;
  insert into order_status_events(order_id, status, changed_by) values (p_order_id, p_new, auth.uid());
end $$;
revoke all on function change_order_status from public, anon;
grant execute on function change_order_status to authenticated;
