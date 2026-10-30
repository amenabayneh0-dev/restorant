import { describe, it, expect } from "vitest";
import { artKind, hash } from "../components/art/DishArt";
import { groupHours } from "../lib/hours";

describe("dish illustration chooser", () => {
  it("draws drinks, desserts, wraps, bowls and plates", () => {
    expect(artKind("Fresh Mango Juice")).toBe("drink");
    expect(artKind("Buna (Ethiopian Coffee)")).toBe("drink");
    expect(artKind("Honey Cake")).toBe("dessert");
    expect(artKind("Veggie Wrap")).toBe("wrap");
    expect(artKind("Sambusa (3 pieces)")).toBe("wrap");
    expect(artKind("Doro Wat")).toBe("bowl");
    expect(artKind("Lentil Soup")).toBe("bowl");
    expect(artKind("Grilled Chicken Plate")).toBe("plate");
  });
  it("does not match keywords inside other words (Platter is not a latte)", () => {
    expect(artKind("Fasting Platter")).toBe("plate");
    expect(artKind("Steakhouse Special")).toBe("plate"); // "tea" inside "steak" must not make it a drink
    expect(artKind("Rollercoaster Burger Combo")).toBe("wrap");
  });
  it("uses the category as a hint", () => { expect(artKind("House Special", "Drinks")).toBe("drink"); });
  it("is stable: the same dish always gets the same look", () => { expect(hash("Doro Wat")).toBe(hash("Doro Wat")); expect(hash("a")).not.toBe(hash("b")); });
});

describe("opening hours grouping", () => {
  it("collapses identical consecutive days", () => {
    const h = { mon: ["08:00", "21:00"], tue: ["08:00", "21:00"], wed: ["08:00", "21:00"], sat: ["09:00", "22:00"] } as never;
    expect(groupHours(h)).toEqual([
      { days: "Mon – Wed", range: "08:00 – 21:00" }, { days: "Thu – Fri", range: "Closed" },
      { days: "Sat", range: "09:00 – 22:00" }, { days: "Sun", range: "Closed" },
    ]);
  });
  it("handles an empty week", () => { expect(groupHours({})).toEqual([{ days: "Mon – Sun", range: "Closed" }]); });
});
