export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string]>>;

// Same-day ranges only (open and close on the same calendar day).
export function openStatus(hours: Hours, timezone: string, now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as keyof Hours;
  const time = `${get("hour")}:${get("minute")}`;
  const range = hours[day];
  const open = !!range && time >= range[0] && time < range[1];
  return { open, opensAt: range?.[0], closesAt: range?.[1] };
}
