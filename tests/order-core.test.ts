import { describe, it, expect } from "vitest";
import { orderInputSchema } from "../lib/validation";
import { hashToken, isPlausibleToken, trackingTokenFor } from "../lib/token";
import { friendlyOrderError } from "../lib/errors";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const base = {
  customerName: "Test Customer", customerPhone: "+251 911 000 000", fulfillment: "pickup",
  idempotencyKey: uuid, items: [{ menuItemId: uuid, quantity: 2 }],
};
const SECRET = "x".repeat(40);

describe("order validation", () => {
  it("accepts a valid pickup order", () => expect(orderInputSchema.safeParse(base).success).toBe(true));
  it("rejects an empty cart", () => expect(orderInputSchema.safeParse({ ...base, items: [] }).success).toBe(false));
  it("rejects quantity 0, 100 and fractions", () => {
    for (const q of [0, 100, 1.5]) expect(orderInputSchema.safeParse({ ...base, items: [{ menuItemId: uuid, quantity: q }] }).success).toBe(false);
  });
  it("requires an address for delivery", () => {
    const r = orderInputSchema.safeParse({ ...base, fulfillment: "delivery" });
    expect(r.success).toBe(false);
  });
  it("requires a table for dine-in", () => expect(orderInputSchema.safeParse({ ...base, fulfillment: "dine_in" }).success).toBe(false));
  it("rejects a bad phone and bad email", () => {
    expect(orderInputSchema.safeParse({ ...base, customerPhone: "abc" }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...base, customerEmail: "nope" }).success).toBe(false);
  });
  it("allows an empty email", () => expect(orderInputSchema.safeParse({ ...base, customerEmail: "" }).success).toBe(true));
  it("drops client-sent prices", () => {
    const r = orderInputSchema.parse({ ...base, items: [{ menuItemId: uuid, quantity: 1, price: 0.01 }] });
    expect(r.items[0]).not.toHaveProperty("price");
  });
});

describe("tracking tokens", () => {
  it("is deterministic per key, so retries keep the same link", () =>
    expect(trackingTokenFor(uuid, SECRET)).toBe(trackingTokenFor(uuid, SECRET)));
  it("differs per key and per secret", () => {
    expect(trackingTokenFor(uuid, SECRET)).not.toBe(trackingTokenFor("other", SECRET));
    expect(trackingTokenFor(uuid, SECRET)).not.toBe(trackingTokenFor(uuid, "y".repeat(40)));
  });
  it("refuses a weak secret", () => expect(() => trackingTokenFor(uuid, "short")).toThrow());
  it("produces a plausible token and a 64-char hash", () => {
    const t = trackingTokenFor(uuid, SECRET);
    expect(isPlausibleToken(t)).toBe(true);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });
  it("rejects junk tokens", () => expect(isPlausibleToken("../etc/passwd")).toBe(false));
});

describe("error messages", () => {
  it("maps known codes", () => expect(friendlyOrderError("RESTAURANT_NOT_ACCEPTING")).toMatch(/not taking orders/));
  it("hides unknown database errors", () => expect(friendlyOrderError("relation orders violates constraint")).toBe("We couldn't place your order. Please try again."));
});

import { addLine, setQuantity, subtotal, itemCount } from "../lib/cart";
import { stepIndex, isFinal } from "../lib/status";
const L = { itemId: "i1", name: "Tibs", unitPrice: 450, quantity: 1, optionIds: ["a"], optionNames: ["Extra injera"] };
describe("cart", () => {
  it("merges identical lines and keeps different options separate", () => {
    let c = addLine([], L); c = addLine(c, L); c = addLine(c, { ...L, optionIds: [] });
    expect(c).toHaveLength(2); expect(c[0].quantity).toBe(2);
  });
  it("option order does not create a new line", () => {
    const c = addLine(addLine([], { ...L, optionIds: ["a", "b"] }), { ...L, optionIds: ["b", "a"] });
    expect(c).toHaveLength(1);
  });
  it("caps at 99 and removes at zero", () => {
    let c = addLine([], { ...L, quantity: 98 }); c = addLine(c, { ...L, quantity: 5 });
    expect(c[0].quantity).toBe(99); expect(setQuantity(c, c[0].key, 0)).toHaveLength(0);
  });
  it("totals without floating point drift", () => {
    const c = addLine(addLine([], { ...L, unitPrice: 0.1, optionIds: [] }), { ...L, itemId: "i2", unitPrice: 0.2, optionIds: [], quantity: 1 });
    expect(subtotal(c)).toBe(0.3); expect(itemCount(c)).toBe(2);
  });
});
describe("status", () => {
  it("knows progress and final states", () => {
    expect(stepIndex("preparing")).toBe(2); expect(stepIndex("rejected")).toBe(-1);
    expect(isFinal("cancelled")).toBe(true); expect(isFinal("ready")).toBe(false);
  });
});

import { actionsFor, visibleStatuses, isStatus, friendlyStatusError } from "../lib/transitions";
describe("staff actions (UI mirror of database rules)", () => {
  const to = (st: string, r: "admin" | "counter" | "kitchen") => actionsFor(st, r).map((a) => a.to);
  it("counter handles intake and handover", () => { expect(to("pending", "counter")).toEqual(["accepted", "rejected"]); expect(to("ready", "counter")).toContain("completed"); });
  it("kitchen cannot accept, reject, complete or cancel", () => {
    expect(to("pending", "kitchen")).toEqual([]); expect(to("ready", "kitchen")).toEqual([]);
    expect(to("accepted", "kitchen")).toEqual(["preparing"]); expect(to("preparing", "kitchen")).toEqual(["ready"]);
  });
  it("final states offer no actions", () => { for (const st of ["completed", "rejected", "cancelled"]) expect(to(st, "admin")).toEqual([]); });
  it("kitchen never sees pending orders", () => { expect(visibleStatuses("kitchen")).not.toContain("pending"); expect(visibleStatuses("counter")).toContain("pending"); });
  it("rejects unknown statuses and hides raw errors", () => { expect(isStatus("pending")).toBe(false); expect(isStatus("DROP")).toBe(false); expect(friendlyStatusError("syntax error at x")).toBe("Couldn't update the order. Try again."); });
});
