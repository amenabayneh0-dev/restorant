export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string]>>;

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const NAMES: Record<string, string> = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };

// Ranges are "HH:MM" in the restaurant's time zone. A close time at or before the open time means the
// shift runs past midnight (e.g. ["18:00","02:00"] is open 18:00 until 02:00 the next morning).
export function openStatus(hours: Hours, timezone: string, now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayKey = get("weekday").toLowerCase().slice(0, 3) as keyof Hours;
  const idx = DAYS.indexOf(dayKey as (typeof DAYS)[number]);
  const time = `${get("hour")}:${get("minute")}`;
  const range = hours[dayKey];
  const yesterday = hours[DAYS[(idx + 6) % 7]];

  // Still inside last night's shift that ran past midnight?
  if (yesterday && yesterday[1] <= yesterday[0] && time < yesterday[1])
    return { open: true, opensAt: range?.[0], closesAt: yesterday[1], next: undefined as string | undefined };

  if (range) {
    const [o, c] = range;
    const open = c <= o ? time >= o : time >= o && time < c;
    if (open) return { open: true, opensAt: o, closesAt: c, next: undefined as string | undefined };
  }

  // Closed right now: when does it open next?
  let next: string | undefined;
  if (range && time < range[0]) next = range[0];
  else {
    for (let i = 1; i <= 7 && !next; i++) {
      const d = DAYS[(idx + i) % 7];
      const r = hours[d];
      if (r) next = `${i === 1 ? "tomorrow" : NAMES[d]} ${r[0]}`;
    }
  }
  return { open: false, opensAt: range?.[0], closesAt: range?.[1], next };
}
