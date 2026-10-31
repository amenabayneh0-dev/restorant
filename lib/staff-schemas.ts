import { z } from "zod";
import { TAG_IDS } from "./tags";
import type { Hours } from "./hours";

/** Lower-case, accent-free, dash-separated; always ends with a short random suffix so slugs stay unique. */
export function slugify(name: string, suffix: string = Math.random().toString(36).slice(2, 7)): string {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "item"}-${suffix}`;
}

const text = (max: number) => z.string().trim().max(max);
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
// An empty box must be an error, not silently 0 (z.coerce turns "" into 0).
const price = z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim().replace(",", ".")) : v), z.coerce.number({ invalid_type_error: "Enter a valid price", required_error: "Enter a price" }).min(0, "Price can't be negative").max(1_000_000, "Price is too large"))
  .transform((n) => Math.round(n * 100) / 100);
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const itemSchema = z.object({
  name: text(120).min(1, "Give the dish a name"),
  category_id: z.string().uuid("Choose a category"),
  description: text(600).default(""),
  price,
  tags: z.array(z.string()).default([]).transform((t) => [...new Set(t)]).refine((t) => t.every((x) => TAG_IDS.includes(x)), "Unknown tag"),
  is_featured: bool, is_published: bool, is_available: bool,
  sort_order: int(0, 9999).default(0),
});
export type ItemInput = z.infer<typeof itemSchema>;

export const categorySchema = z.object({
  name: text(80).min(1, "Give the category a name"),
  description: text(300).optional().transform((v) => v || null),
});

export const optionSchema = z.object({
  menu_item_id: z.string().uuid(),
  group_name: text(60).min(1, "Group name is required (e.g. Size)"),
  name: text(80).min(1, "Option name is required (e.g. Large)"),
  extra_price: price,
});

export const FULFILLMENT = ["pickup", "dine_in", "delivery"] as const;
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABEL: Record<(typeof DAYS)[number], string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

/** Reads the 7 day rows of the settings form (closed checkbox + open/close time) into the Hours shape. */
export function parseHours(get: (k: string) => FormDataEntryValue | null): { hours: Hours; error?: string } {
  const hours: Hours = {};
  for (const d of DAYS) {
    if (get(`${d}_closed`) === "on") continue;
    const o = String(get(`${d}_open`) ?? ""), c = String(get(`${d}_close`) ?? "");
    if (!HHMM.test(o) || !HHMM.test(c)) return { hours, error: `${DAY_LABEL[d]}: enter opening and closing times, or tick Closed` };
    hours[d] = [o, c];
  }
  return { hours };
}

export const settingsSchema = z.object({
  name: text(120).min(1, "Restaurant name is required"),
  tagline: text(160).default(""),
  description: text(1000).default(""),
  phone: text(30).optional().transform((v) => v || null),
  address: text(200).optional().transform((v) => v || null),
  currency_code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency must be 3 letters, e.g. ETB"),
  timezone: z.string().trim().refine(validTimezone, "Unknown time zone (example: Africa/Addis_Ababa)"),
  delivery_enabled: bool,
  delivery_fee: price,
  accepting_orders: bool,
  enabled_fulfillment: z.array(z.enum(FULFILLMENT)).min(1, "Enable at least one way to receive orders"),
});

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function checkImage(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Photo must be a JPEG, PNG or WebP image";
  if (file.size > MAX_IMAGE_BYTES) return "Photo is too large (max 5 MB)";
  return null;
}
export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** First human-readable problem from a zod error, for the red banner. */
export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";

/** Checks the real file signature, not just the type the browser claimed. */
export function sniffImage(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
