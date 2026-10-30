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

-- ---- richer demo content (needs migration 0003) ----
update restaurant_settings set tagline = 'Fresh, honest food, cooked to order.';
insert into menu_categories(name, slug, sort_order, is_published) values ('Starters','starters',0,true) on conflict (slug) do nothing;
update menu_categories set sort_order = case slug when 'starters' then 0 when 'mains' then 1 when 'drinks' then 2 when 'desserts' then 3 else sort_order end;

insert into menu_items(category_id, name, slug, description, price, is_published, is_featured, tags, sort_order)
select c.id, v.name, v.slug, v.descr, v.price, true, v.feat, v.tags::text[], v.ord from (values
 ('starters','Sambusa (3 pieces)','sambusa','Crisp pastry triangles filled with spiced lentils.',75.00,false,'{vegan,fasting,spicy}',1),
 ('starters','Lentil Soup','lentil-soup','Slow-simmered red lentils, garlic and a squeeze of lemon.',85.00,false,'{vegan,fasting}',2),
 ('mains','Doro Wat','doro-wat','Chicken stew in slow-cooked berbere sauce with a boiled egg.',380.00,true,'{spicy,popular}',1),
 ('mains','Shiro Tegabino','shiro-tegabino','Bubbling chickpea stew, finished with olive oil and herbs.',240.00,false,'{vegan,fasting}',2),
 ('mains','Fasting Platter','fasting-platter','A shared platter of seasonal vegetable and lentil dishes.',280.00,true,'{vegan,fasting,popular}',3),
 ('drinks','Spris Juice','spris-juice','Layered mango, avocado and papaya juice.',110.00,true,'{vegan,popular}',2),
 ('drinks','Buna (Ethiopian Coffee)','buna-coffee','Fresh-roasted, hand-brewed, served in a traditional cup.',45.00,false,'{vegan}',3),
 ('drinks','Spiced Tea','spiced-tea','Black tea with cinnamon, cloves and cardamom.',35.00,false,'{vegan}',4),
 ('desserts','Baklava','baklava','Layered pastry, pistachio and honey syrup.',95.00,false,'{vegetarian,new}',2)
) as v(cat, name, slug, descr, price, feat, tags, ord) join menu_categories c on c.slug = v.cat
on conflict (slug) do nothing;
update menu_items set tags = '{popular}', sort_order = 4 where slug = 'grilled-chicken-plate' and tags = '{}';
update menu_items set tags = '{vegetarian}', sort_order = 5 where slug = 'veggie-wrap' and tags = '{}';
update menu_items set tags = '{vegan,popular}', sort_order = 1 where slug = 'fresh-mango-juice' and tags = '{}';
update menu_items set tags = '{vegetarian}', sort_order = 1 where slug = 'honey-cake' and tags = '{}';

insert into menu_item_options(menu_item_id, group_name, name, extra_price, sort_order)
select id, 'Size', v.n, v.p, v.o from menu_items, (values ('Regular',0.00,0),('Large',90.00,1)) as v(n,p,o)
where slug = 'fasting-platter' and not exists (select 1 from menu_item_options o where o.menu_item_id = menu_items.id and o.group_name = 'Size');
insert into menu_item_options(menu_item_id, group_name, name, extra_price)
select id, 'Extras', 'Extra injera', 20.00 from menu_items where slug = 'doro-wat'
  and not exists (select 1 from menu_item_options o where o.menu_item_id = menu_items.id and o.name = 'Extra injera');
insert into menu_item_options(menu_item_id, group_name, name, extra_price)
select id, 'Extras', 'Extra egg', 30.00 from menu_items where slug = 'doro-wat'
  and not exists (select 1 from menu_item_options o where o.menu_item_id = menu_items.id and o.name = 'Extra egg');
