import { describe, it, expect } from "vitest";
import { formatMoney } from "../lib/money";
import { openStatus, type Hours } from "../lib/hours";

const H: Hours = { mon: ["08:00", "21:30"], sun: ["10:00", "20:00"] };
const TZ = "Africa/Addis_Ababa"; // UTC+3, no daylight saving

describe("formatMoney", () => {
  it("shows whole amounts without decimals", () => expect(formatMoney(420, "ETB")).toBe("420 ETB"));
  it("accepts strings and keeps cents", () => expect(formatMoney("12.5", "ETB")).toBe("12.50 ETB"));
  it("adds thousands separators", () => expect(formatMoney(1250, "ETB")).toBe("1,250 ETB"));
});

describe("openStatus", () => {
  it("is open on Monday midday", () => expect(openStatus({ ...H }, TZ, new Date("2026-10-26T09:00:00Z")).open).toBe(true)); // 12:00 local
  it("is closed before opening", () => expect(openStatus({ ...H }, TZ, new Date("2026-10-26T03:00:00Z")).open).toBe(false)); // 06:00 local
  it("is closed at closing time", () => expect(openStatus({ ...H }, TZ, new Date("2026-10-26T18:30:00Z")).open).toBe(false)); // 21:30 local
  it("is closed on a day with no hours", () => expect(openStatus({ ...H }, TZ, new Date("2026-10-27T09:00:00Z"))).toMatchObject({ open: false, opensAt: undefined }));
  it("uses the restaurant's time zone, not the server's", () => expect(openStatus({ ...H }, TZ, new Date("2026-10-26T05:30:00Z")).open).toBe(true)); // 05:30 UTC would be closed; 08:30 in Addis is open
});
