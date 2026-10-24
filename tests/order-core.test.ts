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
