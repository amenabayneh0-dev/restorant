import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase-admin";
import { hashToken, isPlausibleToken } from "@/lib/token";
import { formatMoney } from "@/lib/money";
import { HINT, LABEL, STEPS, isFinal, stepIndex } from "@/lib/status";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };

type Tracking = { reference: string; status: string; fulfillment: string; subtotal: number; delivery_fee: number; total: number; currency_code: string;
  items: { name: string; quantity: number; options: { name: string }[]; line_total: number }[] };

export default async function Track({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPlausibleToken(token)) notFound();
  const { data } = await adminClient().rpc("get_order_tracking", { p_token_hash: hashToken(token) });
  if (!data) notFound();
  const o = data as Tracking;
  const at = stepIndex(o.status);
  return (
    <main className="wrap track">
      {!isFinal(o.status) && <AutoRefresh />}
      <p className="muted">Order {o.reference}</p>
      <h1>{LABEL[o.status]}</h1>
      <p className="lede" role="status">{HINT[o.status]}</p>
      {at >= 0 && (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => (<li key={s} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}>{LABEL[s]}</li>))}
        </ol>
      )}
      <h2>Your items</h2>
      <ul className="lines">
        {o.items.map((it, i) => (<li key={i}><div><b>{it.quantity} × {it.name}</b>{it.options.length > 0 && <small>{it.options.map((x) => x.name).join(", ")}</small>}</div><span>{formatMoney(it.line_total, o.currency_code)}</span></li>))}
      </ul>
      <p className="sum">{Number(o.delivery_fee) > 0 && <>Delivery {formatMoney(o.delivery_fee, o.currency_code)}<br /></>}<strong>Total {formatMoney(o.total, o.currency_code)}</strong></p>
      <p className="muted">Keep this page's link. It is the only way to see your order.</p>
      <a href="/" className="btn">Back to the menu</a>
    </main>
  );
}
