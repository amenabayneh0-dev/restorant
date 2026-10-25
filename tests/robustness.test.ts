import { describe, it, expect, vi, afterEach } from "vitest";
import { envProblems, envReport, publicKey, secretKey, supabaseUrl } from "../lib/env";
import { openStatus, type Hours } from "../lib/hours";
import { addLine, reconcileCart, sanitizeCart, type CartLine, type MenuSnapshot } from "../lib/cart";
import { actionsFor } from "../lib/status";
import { friendlyOrderError } from "../lib/errors";
import { normalizeSettings, DEFAULT_SETTINGS } from "../lib/menu";

afterEach(() => vi.unstubAllEnvs());

describe("environment variables", () => {
  it("cleans the usual copy-paste mistakes", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ' "https://abc.supabase.co/rest/v1/" \n');
    expect(supabaseUrl()).toBe("https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    expect(supabaseUrl()).toBe("https://abc.supabase.co");
  });
  it("accepts both Supabase key naming schemes, preferring the new one", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "old"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "oldsecret");
    expect(publicKey()).toBe("old"); expect(secretKey()).toBe("oldsecret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "new"); vi.stubEnv("SUPABASE_SECRET_KEY", "newsecret");
    expect(publicKey()).toBe("new"); expect(secretKey()).toBe("newsecret");
  });
  it("reports exactly what is missing, and never values", () => {
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "TRACKING_TOKEN_SECRET"]) vi.stubEnv(k, "");
    expect(envProblems()).toHaveLength(4);
    vi.stubEnv("TRACKING_TOKEN_SECRET", "short");
    expect(envReport().TRACKING_TOKEN_SECRET).toBe(false);
    vi.stubEnv("TRACKING_TOKEN_SECRET", "x".repeat(32));
    expect(envReport().TRACKING_TOKEN_SECRET).toBe(true);
    expect(JSON.stringify(envReport())).not.toContain("xxxx");
  });
});

describe("opening hours: overnight shifts and next opening", () => {
  const TZ = "Africa/Addis_Ababa"; // UTC+3
  const night: Hours = { fri: ["18:00", "02:00"], mon: ["08:00", "21:00"] };
  it("is open late Friday night", () => expect(openStatus(night, TZ, new Date("2026-10-23T19:00:00Z")).open).toBe(true)); // Fri 22:00
  it("is still open at 01:00 Saturday (Friday's shift)", () => {
    const s = openStatus(night, TZ, new Date("2026-10-23T22:00:00Z")); // Sat 01:00 local
    expect(s.open).toBe(true); expect(s.closesAt).toBe("02:00");
  });
  it("closes at 02:00 Saturday", () => expect(openStatus(night, TZ, new Date("2026-10-23T23:00:00Z")).open).toBe(false));
  it("says when it opens later today", () => expect(openStatus({ mon: ["08:00", "21:00"] }, TZ, new Date("2026-10-26T03:00:00Z")).next).toBe("08:00"));
  it("says tomorrow after closing", () => expect(openStatus({ mon: ["08:00", "21:00"], tue: ["08:00", "21:00"] }, TZ, new Date("2026-10-26T19:00:00Z")).next).toBe("tomorrow 08:00"));
  it("names the weekday when the next opening is further away", () => expect(openStatus({ mon: ["08:00", "21:00"], sun: ["10:00", "20:00"] }, TZ, new Date("2026-10-27T09:00:00Z")).next).toBe("Sun 10:00"));
  it("has no next opening if no hours are set", () => expect(openStatus({}, TZ).next).toBeUndefined());
});

const L: Omit<CartLine, "key"> = { itemId: "i1", name: "Tibs", unitPrice: 100, quantity: 2, optionIds: ["o1"], optionNames: ["Salad"] };
describe("saved cart safety", () => {
  it("survives garbage in localStorage", () => {
    expect(sanitizeCart("lol")).toEqual([]); expect(sanitizeCart(null)).toEqual([]);
    expect(sanitizeCart([null, 5, { itemId: 1 }, { itemId: "a", name: "A", unitPrice: "x", quantity: 1 }])).toEqual([]);
  });
  it("keeps valid lines and repairs quantity/keys", () => {
    const [l] = sanitizeCart([{ ...L, quantity: 500, key: "stale" }]);
    expect(l.quantity).toBe(99); expect(l.key).toBe("i1:o1");
  });
  const menu: MenuSnapshot = { i1: { price: 90, available: true, options: { o1: { extra: 10, available: true } } } };
  it("keeps a still-valid line unchanged", () => {
    const r = reconcileCart(addLine([], L), menu); expect(r.notes).toEqual([]); expect(r.cart[0].unitPrice).toBe(100);
  });
  it("refreshes a changed price and tells the customer", () => {
    const r = reconcileCart(addLine([], L), { i1: { ...menu.i1, price: 120 } });
    expect(r.cart[0].unitPrice).toBe(130); expect(r.notes[0]).toMatch(/price of Tibs changed/);
  });
  it("removes sold-out, deleted and option-unavailable items", () => {
    const c = addLine([], L);
    expect(reconcileCart(c, { i1: { ...menu.i1, available: false } }).cart).toEqual([]);
    expect(reconcileCart(c, {}).cart).toEqual([]);
    const r = reconcileCart(c, { i1: { price: 90, available: true, options: { o1: { extra: 10, available: false } } } });
    expect(r.cart).toEqual([]); expect(r.notes[0]).toMatch(/no longer available/);
  });
});

describe("staff permissions in the UI", () => {
  const to = (s: string, r: "admin" | "counter" | "kitchen") => actionsFor(s, r).map((a) => a.to);
  it("only front-of-house can accept or decline", () => {
    expect(to("pending", "counter")).toEqual(["accepted", "rejected"]); expect(to("pending", "kitchen")).toEqual([]);
  });
  it("kitchen can start and finish cooking but not complete or cancel", () => {
    expect(to("accepted", "kitchen")).toEqual(["preparing"]); expect(to("preparing", "kitchen")).toEqual(["ready"]); expect(to("ready", "kitchen")).toEqual([]);
  });
  it("finished orders have no actions", () => { for (const s of ["completed", "rejected", "cancelled"]) expect(to(s, "admin")).toEqual([]); });
});

describe("errors and settings fallbacks", () => {
  it("explains the phone throttle", () => expect(friendlyOrderError("TOO_MANY_ORDERS")).toMatch(/several orders/));
  it("falls back to defaults when the settings row is missing", () => expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS));
  it("repairs malformed settings values", () => {
    const s = normalizeSettings({ name: "X", opening_hours: null as never, enabled_fulfillment: null as never, delivery_fee: "50" as never });
    expect(s.opening_hours).toEqual({}); expect(s.enabled_fulfillment).toEqual(["pickup", "dine_in"]); expect(s.delivery_fee).toBe(50);
  });
});
