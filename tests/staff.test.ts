import { describe, expect, it } from "vitest";
import { categorySchema, checkImage, itemSchema, optionSchema, parseHours, settingsSchema, slugify, sniffImage, validTimezone } from "@/lib/staff-schemas";
import { buildReport, dayKey } from "@/lib/report";

const CAT = "11111111-1111-4111-8111-111111111111";
const base = { name: " Doro Wat ", category_id: CAT, description: "", price: "250", tags: ["spicy", "spicy"], is_featured: "on", is_published: "on", is_available: undefined, sort_order: "3" };

describe("slugify", () => {
  it("lowercases, strips accents and symbols, appends the suffix", () => {
    expect(slugify("Crème Brûlée & Co!", "abc12")).toBe("creme-brulee-co-abc12");
  });
  it("falls back for names with no latin letters (e.g. Amharic)", () => { expect(slugify("ዶሮ ወጥ", "x1")).toBe("item-x1"); });
  it("is unique per call by default", () => { expect(slugify("Tea")).not.toBe(slugify("Tea")); });
});

describe("itemSchema", () => {
  it("parses a valid form, trims, dedupes tags, reads checkboxes", () => {
    const r = itemSchema.parse(base);
    expect(r).toMatchObject({ name: "Doro Wat", price: 250, tags: ["spicy"], is_featured: true, is_published: true, is_available: false, sort_order: 3 });
  });
  it("accepts a comma decimal and rounds to cents", () => { expect(itemSchema.parse({ ...base, price: "12,345" }).price).toBe(12.35); });
  it.each([["", "name"], ["   ", "name"]])("rejects empty name %j", (name) => { expect(itemSchema.safeParse({ ...base, name }).success).toBe(false); });
  it("rejects negative, non-numeric and absurd prices", () => {
    for (const price of ["-1", "abc", "", "99999999"]) expect(itemSchema.safeParse({ ...base, price }).success, price).toBe(false);
  });
  it("rejects unknown tags and a bad category id", () => {
    expect(itemSchema.safeParse({ ...base, tags: ["spicy", "bogus"] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, category_id: "nope" }).success).toBe(false);
  });
});

describe("category & option schemas", () => {
  it("requires a category name; empty description becomes null", () => {
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(categorySchema.parse({ name: "Mains", description: "" }).description).toBeNull();
  });
  it("option needs group, name and non-negative price", () => {
    const ok = { menu_item_id: CAT, group_name: "Size", name: "Large", extra_price: "20" };
    expect(optionSchema.parse(ok).extra_price).toBe(20);
    expect(optionSchema.safeParse({ ...ok, group_name: "" }).success).toBe(false);
    expect(optionSchema.safeParse({ ...ok, extra_price: "-5" }).success).toBe(false);
  });
});

describe("settings", () => {
  const ok = { name: "Cafe", tagline: "", description: "", phone: "", address: "", currency_code: "etb", timezone: "Africa/Addis_Ababa", delivery_enabled: undefined, delivery_fee: "30", accepting_orders: "on", enabled_fulfillment: ["pickup"] };
  it("uppercases currency and nulls empty optional fields", () => {
    const r = settingsSchema.parse(ok); expect(r.currency_code).toBe("ETB"); expect(r.phone).toBeNull(); expect(r.delivery_fee).toBe(30);
  });
  it("rejects bad currency, bad timezone and no fulfilment method", () => {
    expect(settingsSchema.safeParse({ ...ok, currency_code: "ET" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, enabled_fulfillment: [] }).success).toBe(false);
  });
  it("validTimezone", () => { expect(validTimezone("UTC")).toBe(true); expect(validTimezone("Nope/Zone")).toBe(false); });
  it("parseHours reads open days, skips closed ones, supports overnight", () => {
    const f = new Map<string, string>([["mon_open", "11:00"], ["mon_close", "22:00"], ["tue_closed", "on"], ["wed_open", "18:00"], ["wed_close", "02:00"], ["thu_closed", "on"], ["fri_closed", "on"], ["sat_closed", "on"], ["sun_closed", "on"]]);
    const r = parseHours((k) => f.get(k) ?? null);
    expect(r.error).toBeUndefined(); expect(r.hours).toEqual({ mon: ["11:00", "22:00"], wed: ["18:00", "02:00"] });
  });
  it("parseHours reports a day with missing/invalid times", () => {
    const r = parseHours((k) => ({ mon_open: "25:00", mon_close: "10:00" } as Record<string, string>)[k] ?? (k.endsWith("_closed") && !k.startsWith("mon") ? "on" : null));
    expect(r.error).toMatch(/Monday/);
  });
});

describe("image checks", () => {
  it("accepts jpeg/png/webp up to 5MB only", () => {
    expect(checkImage({ type: "image/webp", size: 1000 })).toBeNull();
    expect(checkImage({ type: "image/gif", size: 1000 })).toMatch(/JPEG/);
    expect(checkImage({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/large/);
  });
  it("sniffs real signatures and rejects disguised files", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/png");
    expect(sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(sniffImage(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("buildReport", () => {
  const tz = "Africa/Addis_Ababa";
  const now = new Date("2026-10-30T09:00:00Z"); // 12:00 in Addis
  const o = (status: string, total: number, iso: string, items: [string, number, number][]) => ({ status, total, created_at: iso, order_items: items.map(([item_name, quantity, line_total]) => ({ item_name, quantity, line_total })) });
  const orders = [
    o("completed", 300, "2026-10-30T07:00:00Z", [["Tibs", 2, 200], ["Tea", 2, 100]]),
    o("pending", 100, "2026-10-29T10:00:00Z", [["Tea", 4, 100]]),
    o("rejected", 999, "2026-10-30T07:30:00Z", [["Tibs", 9, 999]]),
    o("cancelled", 50, "2026-10-30T08:00:00Z", []),
    o("completed", 70, "2026-10-01T10:00:00Z", [["Old", 1, 70]]), // outside the window
  ];
  const r = buildReport(orders, tz, 7, now);
  it("counts only non-rejected/cancelled orders inside the window", () => { expect(r.orders).toBe(2); expect(r.revenue).toBe(400); expect(r.average).toBe(200); });
  it("returns one bucket per day, oldest first, ending today", () => {
    expect(r.days).toHaveLength(7); expect(r.days[6]).toMatchObject({ day: "2026-10-30", orders: 1, revenue: 300 }); expect(r.days[5]).toMatchObject({ day: "2026-10-29", revenue: 100 });
  });
  it("ranks top items by quantity and excludes declined orders", () => { expect(r.top.map((t) => [t.name, t.qty])).toEqual([["Tea", 6], ["Tibs", 2]]); });
  it("buckets by the restaurant's day, not UTC (21:30Z is already tomorrow in Addis)", () => { expect(dayKey("2026-10-29T21:30:00Z", tz)).toBe("2026-10-30"); });
  it("handles no orders without dividing by zero", () => { expect(buildReport([], tz, 7, now)).toMatchObject({ orders: 0, revenue: 0, average: 0, top: [] }); });
});
