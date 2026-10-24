import { publicClient } from "./supabase-public";
import type { Hours } from "./hours";

export type Option = { id: string; group_name: string; name: string; extra_price: number; is_available: boolean; sort_order: number };
export type Item = { id: string; category_id: string; name: string; slug: string; description: string; price: number; is_featured: boolean; is_available: boolean; menu_item_options: Option[] };
export type Category = { id: string; name: string; slug: string; description: string | null; items: Item[] };
export type Settings = { name: string; description: string; phone: string | null; address: string | null; currency_code: string; timezone: string; opening_hours: Hours; accepting_orders: boolean; delivery_enabled: boolean; enabled_fulfillment: string[]; delivery_fee: number };

export async function getMenu(): Promise<{ settings: Settings; categories: Category[] }> {
  const db = publicClient();
  const [s, c, i] = await Promise.all([
    db.from("restaurant_settings").select("*").single(),
    db.from("menu_categories").select("id,name,slug,description").order("sort_order"),
    db.from("menu_items")
      .select("id,category_id,name,slug,description,price,is_featured,is_available,menu_item_options(id,group_name,name,extra_price,is_available,sort_order)")
      .order("name"),
  ]);
  if (s.error || c.error || i.error) throw new Error("Could not load the menu");
  const items = (i.data ?? []) as unknown as Item[];
  const categories = (c.data ?? []).map((cat) => ({ ...cat, items: items.filter((x) => x.category_id === cat.id) }));
  return { settings: s.data as unknown as Settings, categories: categories.filter((x) => x.items.length > 0) };
}
