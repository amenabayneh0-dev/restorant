import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { actionsFor, visibleStatuses, type Role } from "@/lib/transitions";
import { LABEL } from "@/lib/status";
import { formatMoney } from "@/lib/money";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SoundAlert } from "@/components/SoundAlert";
import { changeStatus, logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };
type Order = { id: string; reference: string; customer_name: string; customer_phone: string; fulfillment: string; table_number: string | null; delivery_address: string | null;
  note: string | null; status: string; total: number; currency_code: string; created_at: string;
  order_items: { item_name: string; quantity: number; selected_options: { name: string }[]; instructions: string | null }[] };
const HOW: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };

export default async function Staff({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/staff/login");
  const { data: profile } = await sb.from("staff_profiles").select("display_name,role").eq("user_id", user.id).maybeSingle();
  if (!profile) return (
    <main className="wrap" style={{ paddingTop: "12vh" }}><h1>No staff access</h1><p>This account isn't set up as staff. Ask the owner to add you.</p>
      <form action={logout}><button className="btn">Sign out</button></form></main>);

  const role = profile.role as Role;
  const { data } = await sb.from("orders")
    .select("id,reference,customer_name,customer_phone,fulfillment,table_number,delivery_address,note,status,total,currency_code,created_at,order_items(item_name,quantity,selected_options,instructions)")
    .in("status", visibleStatuses(role)).order("created_at", { ascending: true });
  const orders = (data ?? []) as unknown as Order[];
  const pending = orders.filter((o) => o.status === "pending").length;
  const now = Date.now();

  return (
    <main className="wrap board">
      <AutoRefresh seconds={8} />
      <div className="sheet-top">
        <h1>{role === "kitchen" ? "Kitchen" : "Orders"}</h1>
        <form action={logout}><button className="btn">Sign out ({profile.display_name})</button></form>
      </div>
      <p><SoundAlert pending={pending} /></p>
      {error && <p className="err" role="alert">{error}</p>}
      {orders.length === 0 && <p className="muted">No active orders. New ones appear here automatically.</p>}
      {orders.map((o) => {
        const mins = Math.max(0, Math.floor((now - new Date(o.created_at).getTime()) / 60000));
        return (
          <article key={o.id} className={`ocard s-${o.status}`}>
            <header><b>{o.reference}</b><span className="tag">{LABEL[o.status]}</span><span className="muted">{mins} min ago</span></header>
            <p><b>{HOW[o.fulfillment]}</b>{o.table_number && ` · Table ${o.table_number}`} · {o.customer_name}
              {role !== "kitchen" && <> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></>}</p>
            {role !== "kitchen" && o.delivery_address && <p>Deliver to: {o.delivery_address}</p>}
            <ul className="lines">
              {o.order_items.map((it, i) => (<li key={i}><div><b>{it.quantity} × {it.item_name}</b>{it.selected_options.length > 0 && <small>{it.selected_options.map((x) => x.name).join(", ")}</small>}{it.instructions && <small>Note: {it.instructions}</small>}</div></li>))}
            </ul>
            {o.note && <p className="note-k">Order note: {o.note}</p>}
            {role !== "kitchen" && <p><b>{formatMoney(o.total, o.currency_code)}</b> · collect on {o.fulfillment === "delivery" ? "delivery" : "receipt"}</p>}
            <div className="acts">
              {actionsFor(o.status, role).map((a) => (
                <form key={a.to} action={changeStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="to" value={a.to} />
                  <button className={a.tone === "primary" ? "btn solid" : "btn danger"}>{a.label}</button></form>))}
            </div>
          </article>);
      })}
    </main>
  );
}
