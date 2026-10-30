import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase-admin";
import { hashToken, isPlausibleToken } from "@/lib/token";
import { formatMoney } from "@/lib/money";
import { HINT, LABEL, STEPS, isFinal, stepIndex } from "@/lib/status";
import { AutoRefresh } from "@/components/AutoRefresh";
import { TrackMotion } from "@/components/TrackMotion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };

type Tracking = { reference: string; status: string; fulfillment: string; subtotal: number; delivery_fee: number; total: number; currency_code: string;
  items: { name: string; quantity: number; options: { name: string }[]; line_total: number }[] };

export default async function Track({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPlausibleToken(token)) notFound();
  const { data, error } = await adminClient().rpc("get_order_tracking", { p_token_hash: hashToken(token) });
  if (error) { console.error("[track] lookup failed:", error.message); throw new Error("Could not load your order"); }
  if (!data) notFound();
  const o = data as Tracking;
  const at = stepIndex(o.status);
  const contact = await adminClient().from("restaurant_settings").select("name,phone").maybeSingle();
  return (
    <TrackMotion>
      <main className="track">
        <div className="track-in">
          {!isFinal(o.status) && <AutoRefresh seconds={8} />}
          <p className="eyebrow">{contact.data?.name ?? "Your order"} · Order {o.reference}</p>
          <h1>{LABEL[o.status]}</h1>
          <p className="lede" role="status">{HINT[o.status]}</p>
          {at >= 0 && (
            <ol className="stepper" style={{ "--p": at / (STEPS.length - 1) } as React.CSSProperties} aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}>
                  <span className="dot" aria-hidden="true">{i < at ? "✓" : i + 1}</span><span className="lbl">{LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}
          <section className="receipt" aria-label="Your items">
            <h2>Your items</h2>
            <ul className="lines">
              {o.items.map((it, i) => (<li key={i}><div><b>{it.quantity} × {it.name}</b>{it.options.length > 0 && <small>{it.options.map((x) => x.name).join(", ")}</small>}</div><span>{formatMoney(it.line_total, o.currency_code)}</span></li>))}
            </ul>
            <p className="sum">{Number(o.delivery_fee) > 0 && <>Delivery {formatMoney(o.delivery_fee, o.currency_code)}<br /></>}<strong>Total {formatMoney(o.total, o.currency_code)}</strong><small> Pay on receipt.</small></p>
          </section>
          <p className="muted">Keep this page&rsquo;s link. It is the only way to see your order.</p>
          <div className="cta-row">
            <a href="/" className="btn solid">Back to the menu</a>
            {contact.data?.phone && <a href={`tel:${contact.data.phone}`} className="btn">Call the restaurant</a>}
          </div>
        </div>
      </main>
    </TrackMotion>
  );
}
