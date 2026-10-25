import { publicClient } from "./supabase-public";
import type { Hours } from "./hours";

export type Option = { id: string; group_name: string; name: string; extra_price: number; is_available: boolean; sort_order: number };
export type Item = { id: string; category_id: string; name: string; slug: string; description: string; price: number; is_featured: boolean; is_available: boolean; menu_item_options: Option[] };
export type Category = { id: string; name: string; slug: string; description: string | null; items: Item[] };
export type Settings = { name: string; description: string; phone: string | null; address: string | null; currency_code: string; timezone: string; opening_hours: Hours; accepting_orders: boolean; delivery_enabled: boolean; enabled_fulfillment: string[]; delivery_fee: number };

// Shown if the restaurant_settings row is missing, so the site degrades gracefully instead of crashing.
export const DEFAULT_SETTINGS: Settings = {
  name: "Our Restaurant", description: "", phone: null, address: null, currency_code: "ETB", timezone: "Africa/Addis_Ababa",
  opening_hours: {}, accepting_orders: true, delivery_enabled: false, enabled_fulfillment: ["pickup", "dine_in"], delivery_fee: 0,
};

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS, ...raw,
    description: raw.description ?? "",
    opening_hours: raw.opening_hours && typeof raw.opening_hours === "object" ? raw.opening_hours : {},
    enabled_fulfillment: Array.isArray(raw.enabled_fulfillment) ? raw.enabled_fulfillment : DEFAULT_SETTINGS.enabled_fulfillment,
    delivery_fee: Number(raw.delivery_fee ?? 0),
  };
}

export async function getMenu(): Promise<{ settings: Settings; categories: Category[] }> {
  const db = publicClient();
  const [s, c, i] = await Promise.all([
    db.from("restaurant_settings").select("*").maybeSingle(),
    db.from("menu_categories").select("id,name,slug,description").order("sort_order"),
    db.from("menu_items")
      .select("id,category_id,name,slug,description,price,is_featured,is_available,menu_item_options(id,group_name,name,extra_price,is_available,sort_order)")
      .order("name"),
  ]);
  const failed = [["restaurant_settings", s.error], ["menu_categories", c.error], ["menu_items", i.error]].find(([, e]) => e);
  if (failed) {
    // Shows up in Vercel > Logs. Typical causes: wrong key, migration not run, wrong project URL.
    console.error(`[menu] could not read ${failed[0]}:`, (failed[1] as { message: string }).message);
    throw new Error("Could not load the menu");
  }
  const items = (i.data ?? []) as unknown as Item[];
  const categories = (c.data ?? []).map((cat) => ({ ...cat, items: items.filter((x) => x.category_id === cat.id) }));
  return { settings: normalizeSettings(s.data as unknown as Settings | null), categories: categories.filter((x) => x.items.length > 0) };
}
