-- FICTIONAL DEMO DATA for development only. Never run against production.
insert into restaurant_settings(name, description, phone, address, enabled_fulfillment, opening_hours)
values ('Demo Kitchen (fictional)', 'Sample restaurant for demonstration.', '+251000000000', 'Demo Street, Addis Ababa',
 '{pickup,dine_in,delivery}', '{"mon":["08:00","21:00"],"tue":["08:00","21:00"],"wed":["08:00","21:00"],"thu":["08:00","21:00"],"fri":["08:00","21:00"],"sat":["09:00","22:00"],"sun":["09:00","20:00"]}')
on conflict (id) do update set name = excluded.name, description = excluded.description, phone = excluded.phone,
  address = excluded.address, enabled_fulfillment = excluded.enabled_fulfillment, opening_hours = excluded.opening_hours;
update restaurant_settings set delivery_enabled = true, delivery_fee = 50;

insert into menu_categories(name, slug, sort_order) values
 ('Mains','mains',1), ('Drinks','drinks',2), ('Desserts','desserts',3)
on conflict (slug) do nothing;

insert into menu_items(category_id, name, slug, description, price, is_published, is_featured)
select c.id, v.name, v.slug, v.descr, v.price, true, v.feat from (values
 ('mains','Grilled Chicken Plate','grilled-chicken-plate','Herb-marinated chicken with rice.',320.00,true),
 ('mains','Veggie Wrap','veggie-wrap','Roasted vegetables in a soft wrap.',210.00,false),
 ('drinks','Fresh Mango Juice','fresh-mango-juice','Blended to order.',90.00,true),
 ('desserts','Honey Cake','honey-cake','Slice of house honey cake.',110.00,false)
) as v(cat, name, slug, descr, price, feat) join menu_categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into menu_item_options(menu_item_id, group_name, name, extra_price)
select id, 'Extras', 'Extra cheese', 25.00 from menu_items where slug = 'veggie-wrap'
  and not exists (select 1 from menu_item_options o where o.menu_item_id = menu_items.id and o.name = 'Extra cheese');
insert into menu_item_options(menu_item_id, group_name, name, extra_price)
select id, 'Extras', 'Side salad', 40.00 from menu_items where slug = 'grilled-chicken-plate'
  and not exists (select 1 from menu_item_options o where o.menu_item_id = menu_items.id and o.name = 'Side salad');
