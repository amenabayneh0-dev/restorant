-- MenuFlow 0003: dietary tags, menu ordering, tagline and hero photo. Idempotent.
alter table menu_items add column if not exists tags text[] not null default '{}';
alter table menu_items add column if not exists sort_order int not null default 0;
alter table restaurant_settings add column if not exists tagline text not null default '';
alter table restaurant_settings add column if not exists hero_image_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'menu_items_tags_valid') then
    alter table menu_items add constraint menu_items_tags_valid
      check (tags <@ array['vegetarian','vegan','spicy','gluten-free','fasting','popular','new']::text[]);
  end if;
end $$;

-- Staff may read unpublished/archived rows for the editor (public policy already limits what visitors see).
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'items_staff_read') then
    create policy items_staff_read on menu_items for select using (current_staff_role() is not null);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'categories_staff_read') then
    create policy categories_staff_read on menu_categories for select using (current_staff_role() is not null);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'options_staff_read') then
    create policy options_staff_read on menu_item_options for select using (current_staff_role() is not null);
  end if;
end $$;
