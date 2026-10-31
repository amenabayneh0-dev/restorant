export type ReportOrder = {
  status: string; total: number | string; created_at: string;
  order_items: { item_name: string; quantity: number; line_total: number | string }[];
};
const EXCLUDED = ["rejected", "cancelled"];

/** Calendar day (YYYY-MM-DD) of an instant in the restaurant's time zone. */
export const dayKey = (iso: string | Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

export function buildReport(orders: ReportOrder[], tz: string, days = 7, now: Date = new Date()) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(now.getTime() - i * 86_400_000), tz));
  const perDay = new Map(keys.map((k) => [k, { day: k, orders: 0, revenue: 0 }]));
  const items = new Map<string, { name: string; qty: number; revenue: number }>();
  let count = 0, revenue = 0;
  for (const o of orders) {
    if (EXCLUDED.includes(o.status)) continue;
    const bucket = perDay.get(dayKey(o.created_at, tz));
    if (!bucket) continue; // outside the window
    const total = Number(o.total);
    bucket.orders++; bucket.revenue += total; count++; revenue += total;
    for (const it of o.order_items ?? []) {
      const cur = items.get(it.item_name) ?? { name: it.item_name, qty: 0, revenue: 0 };
      cur.qty += it.quantity; cur.revenue += Number(it.line_total); items.set(it.item_name, cur);
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    orders: count, revenue: round(revenue), average: count ? round(revenue / count) : 0,
    days: [...perDay.values()].map((d) => ({ ...d, revenue: round(d.revenue) })),
    top: [...items.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8).map((x) => ({ ...x, revenue: round(x.revenue) })),
  };
}
