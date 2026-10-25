import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { staffClient } from "@/lib/supabase-staff";
import { formatMoney } from "@/lib/money";
import { LABEL, actionsFor, isFinal, type StaffRole } from "@/lib/status";
import { AutoRefresh } from "@/components/AutoRefresh";
import { setAccepting, setAvailable, setStatus, signOut } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

type Order = {
  id: string; reference: string; status: string; fulfillment: string; customer_name: string; customer_phone: string;
  table_number: string | null; delivery_address: string | null; note: string | null; total: number; currency_code: string; created_at: string;
  order_items: { item_name: string; quantity: number; selected_options: { name: string }[]; instructions: string | null }[];
};
const ERR: Record<string, string> = {
  forbidden: "Your role isn't allowed to do that.", failed: "That didn't work. The order may have changed; the list was refreshed.", bad: "Invalid request.",
};
const HOW: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };

export default async function Staff({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const db = await staffClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/staff/login");

  const { data: roleData } = await db.rpc("current_staff_role");
  const role = roleData as StaffRole | null;
  if (!role) {
    return (
      <main className="wrap staff">
        <h1>No access</h1>
        <p>You're signed in as {auth.user.email}, but this account hasn't been given a staff role yet. Ask the administrator to add you.</p>
        <form action={signOut}><button className="btn">Sign out</button></form>
      </main>
    );
  }

  const [{ data: orders }, { data: settings }, { data: items }] = await Promise.all([
    db.from("orders")
      .select("id,reference,status,fulfillment,customer_name,customer_phone,table_number,delivery_address,note,total,currency_code,created_at,order_items(item_name,quantity,selected_options,instructions)")
      .order("created_at", { ascending: false }).limit(100),
    db.from("restaurant_settings").select("accepting_orders,timezone").maybeSingle(),
    role === "admin" ? db.from("menu_items").select("id,name,is_available").order("name") : Promise.resolve({ data: null }),
  ]);
  const all = (orders ?? []) as unknown as Order[];
  const active = all.filter((o) => !isFinal(o.status)).reverse(); // oldest first: that's who has waited longest
  const done = all.filter((o) => isFinal(o.status)).slice(0, 15);
  const tz = settings?.timezone ?? "UTC";
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const card = (o: Order) => (
    <article key={o.id} className={`ocard ${o.status === "pending" ? "new" : ""}`}>
      <header>
        <h3>{o.reference} · {o.customer_name}</h3>
        <span><span className="badge">{LABEL[o.status] ?? o.status}</span> <span className="badge">{HOW[o.fulfillment]}{o.table_number ? ` ${o.table_number}` : ""}</span> <span className="badge">{time(o.created_at)}</span></span>
      </header>
      <p className="muted"><a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>{o.delivery_address ? ` · ${o.delivery_address}` : ""}</p>
      <ul>
        {o.order_items.map((it, i) => (
          <li key={i}><b>{it.quantity} × {it.item_name}</b>
            {it.selected_options.length > 0 && <small>{it.selected_options.map((x) => x.name).join(", ")}</small>}
            {it.instructions && <small>“{it.instructions}”</small>}</li>
        ))}
      </ul>
      {o.note && <p><b>Note:</b> {o.note}</p>}
      <p><strong>{formatMoney(o.total, o.currency_code)}</strong> <span className="muted">pay on receipt</span></p>
      <div className="acts">
        {actionsFor(o.status, role).map((a, i) => (
          <form key={a.to} action={setStatus}>
            <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="to" value={a.to} />
            <button className={`btn small ${i === 0 ? "go" : ""}`}>{a.label}</button>
          </form>
        ))}
      </div>
    </article>
  );

  return (
    <main className="wrap staff">
      <AutoRefresh seconds={10} />
      <div className="staff-top">
        <h1>Orders <span className="badge">{role}</span></h1>
        <form action={signOut}><button className="btn small">Sign out</button></form>
      </div>
      {err && <p className="notice" role="alert">{ERR[err] ?? ERR.failed}</p>}

      {role === "admin" && settings && (
        <form action={setAccepting} className="notice">
          Online orders are <b>{settings.accepting_orders ? "ON" : "PAUSED"}</b>.{" "}
          <input type="hidden" name="value" value={String(!settings.accepting_orders)} />
          <button className="btn small">{settings.accepting_orders ? "Pause orders" : "Resume orders"}</button>
        </form>
      )}

      <h2>Active ({active.length})</h2>
      {active.length === 0 ? <p className="muted">No active orders. This page refreshes by itself.</p> : active.map(card)}

      {role === "admin" && items && (
        <details className="panel"><summary>Sold-out switches</summary>
          {items.map((it) => (
            <form key={it.id} action={setAvailable} className="stock">
              <span>{it.name}{!it.is_available && <b className="err"> · sold out</b>}</span>
              <input type="hidden" name="itemId" value={it.id} /><input type="hidden" name="value" value={String(!it.is_available)} />
              <button className="btn small">{it.is_available ? "Mark sold out" : "Back in stock"}</button>
            </form>
          ))}
        </details>
      )}

      <details className="panel"><summary>Recently finished ({done.length})</summary>{done.map(card)}</details>
    </main>
  );
}
