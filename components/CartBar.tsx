"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cartActions, useCart } from "@/lib/cart-store";
import { itemCount, subtotal, type MenuSnapshot } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { placeOrder } from "@/app/actions/place-order";

type Props = { currency: string; deliveryFee: number; fulfillment: string[]; open: boolean; menu: MenuSnapshot };
const NAMES: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };
const FIELD_OF: Record<string, string> = { name: "customerName", phone: "customerPhone", email: "customerEmail", table: "tableNumber", address: "deliveryAddress", note: "note" };

export function CartBar({ currency, deliveryFee, fulfillment, open, menu }: Props) {
  const cart = useCart();
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  // One idempotency key per distinct order. A retry of the SAME order (e.g. after a dropped connection) reuses it,
  // so it can never create a duplicate; changing anything creates a fresh key.
  const attempt = useRef({ key: "", fingerprint: "" });
  const [f, setF] = useState({ name: "", phone: "", email: "", method: fulfillment[0] ?? "pickup", table: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string[] | undefined>>({});

  useEffect(() => { setNotes(cartActions.hydrate(menu)); }, [menu]);
  const count = itemCount(cart);
  const fee = f.method === "delivery" ? deliveryFee : 0;
  const total = subtotal(cart) + fee;
  if (count === 0 && !dlg.current?.open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(""); setErrs({});
    const body = {
      customerName: f.name, customerPhone: f.phone, customerEmail: f.email, fulfillment: f.method,
      tableNumber: f.table, deliveryAddress: f.address, note: f.note,
      items: cart.map((l) => ({ menuItemId: l.itemId, quantity: l.quantity, optionIds: l.optionIds })),
    };
    const fingerprint = JSON.stringify(body);
    if (!attempt.current.key || attempt.current.fingerprint !== fingerprint)
      attempt.current = { key: crypto.randomUUID(), fingerprint };
    try {
      const res = await placeOrder({ ...body, idempotencyKey: attempt.current.key });
      if (!res.ok) { setMsg(res.fieldErrors?.items?.[0] ?? res.message); setErrs(res.fieldErrors ?? {}); return; }
      attempt.current = { key: "", fingerprint: "" };
      cartActions.clear(); dlg.current?.close();
      router.push(res.trackingPath);
    } catch {
      // Network drop or server error: never leave the button stuck on "Placing order...".
      setMsg("We couldn't reach the restaurant. Check your connection and press Place order again. You won't be charged twice.");
    } finally {
      setBusy(false);
    }
  }
  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const err = errs[FIELD_OF[k]]?.[0];
    return (
      <label className="fld">{label}
        <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!err} {...props} />
        {err && <span className="err">{err}</span>}
      </label>
    );
  };

  return (
    <>
      <button className="cartbar" onClick={() => dlg.current?.showModal()}>
        <span>View order ({count})</span><strong>{formatMoney(subtotal(cart), currency)}</strong>
      </button>
      <dialog ref={dlg} className="sheet" aria-labelledby="cart-h">
        <div className="sheet-in">
          <div className="sheet-top"><h2 id="cart-h">Your order</h2><button className="btn" onClick={() => dlg.current?.close()}>Close</button></div>
          {notes.length > 0 && <div className="notice" role="status">{notes.map((n) => <p key={n}>{n}</p>)}</div>}
          {cart.length === 0 && <p>Your order is empty.</p>}
          <ul className="lines">
            {cart.map((l) => (
              <li key={l.key}>
                <div><b>{l.name}</b>{l.optionNames.length > 0 && <small>{l.optionNames.join(", ")}</small>}</div>
                <div className="qty">
                  <button aria-label={`Remove one ${l.name}`} onClick={() => cartActions.setQty(l.key, l.quantity - 1)}>−</button>
                  <span aria-live="polite">{l.quantity}</span>
                  <button aria-label={`Add one ${l.name}`} onClick={() => cartActions.setQty(l.key, l.quantity + 1)}>+</button>
                </div>
                <span>{formatMoney(l.unitPrice * l.quantity, currency)}</span>
              </li>
            ))}
          </ul>
          {cart.length > 0 && (
            <form onSubmit={submit} noValidate>
              <fieldset className="methods"><legend>How do you want it?</legend>
                {fulfillment.map((m) => (<label key={m}><input type="radio" name="method" checked={f.method === m} onChange={() => setF({ ...f, method: m })} />{NAMES[m] ?? m}</label>))}
              </fieldset>
              {field("name", "Your name", { autoComplete: "name" })}
              {field("phone", "Phone number", { type: "tel", autoComplete: "tel" })}
              {field("email", "Email (optional)", { type: "email", autoComplete: "email" })}
              {f.method === "dine_in" && field("table", "Table number")}
              {f.method === "delivery" && field("address", "Delivery address", { autoComplete: "street-address" })}
              {field("note", "Note for the kitchen (optional)")}
              <p className="sum">{fee > 0 && <>Delivery {formatMoney(fee, currency)}<br /></>}<strong>Total {formatMoney(total, currency)}</strong><small> Pay when you receive your order.</small></p>
              {!open && <p className="err">We're not taking orders right now.</p>}
              <p className="err" role="alert">{msg}</p>
              <button className="btn solid" disabled={busy || !open}>{busy ? "Placing order..." : "Place order"}</button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
