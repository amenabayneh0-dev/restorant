import type { Metadata } from "next";
import { requireStaff } from "@/lib/staff-auth";
import { buildReport, type ReportOrder } from "@/lib/report";
import { formatMoney } from "@/lib/money";
import { StaffNav } from "@/components/staff/StaffNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sales report", robots: { index: false, follow: false } };

export default async function Report() {
  const { db, role } = await requireStaff(["admin", "counter"]);
  const since = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const [{ data: s }, { data: orders, error }] = await Promise.all([
    db.from("restaurant_settings").select("timezone,currency_code").maybeSingle(),
    db.from("orders").select("status,total,created_at,order_items(item_name,quantity,line_total)").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
  ]);
  const tz = s?.timezone ?? "Africa/Addis_Ababa", cur = (s?.currency_code ?? "ETB").trim();
  const r = buildReport((orders ?? []) as unknown as ReportOrder[], tz, 7);
  const max = Math.max(1, ...r.days.map((d) => d.revenue));
  const label = (k: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(new Date(`${k}T12:00:00Z`));

  return (
    <main className="wrap staff">
      <StaffNav role={role} active="report" />
      <h1>Last 7 days</h1>
      {error && <p className="notice bad" role="alert">Couldn’t load orders.</p>}
      <div className="kpis">
        <div className="kpi"><span className="muted">Orders</span><b>{r.orders}</b></div>
        <div className="kpi"><span className="muted">Revenue</span><b>{formatMoney(r.revenue, cur)}</b></div>
        <div className="kpi"><span className="muted">Average order</span><b>{formatMoney(r.average, cur)}</b></div>
      </div>
      <p className="muted small">Declined and cancelled orders are not counted.</p>

      <section className="panelbox" aria-labelledby="perday"><h2 id="perday">Revenue per day</h2>
        <ol className="bars">
          {r.days.map((d) => (
            <li key={d.day}>
              <span className="bar-label">{label(d.day)}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(d.revenue / max) * 100}%` }} /></span>
              <span className="bar-val">{formatMoney(d.revenue, cur)} <small className="muted">· {d.orders} order{d.orders === 1 ? "" : "s"}</small></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panelbox" aria-labelledby="top"><h2 id="top">Top dishes</h2>
        {r.top.length === 0 ? <p className="muted">No orders in this period yet.</p> : (
          <table className="rtable"><thead><tr><th scope="col">Dish</th><th scope="col">Sold</th><th scope="col">Revenue</th></tr></thead>
            <tbody>{r.top.map((t) => <tr key={t.name}><th scope="row">{t.name}</th><td>{t.qty}</td><td>{formatMoney(t.revenue, cur)}</td></tr>)}</tbody></table>
        )}
      </section>
    </main>
  );
}
