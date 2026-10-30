"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { cartActions, useCart } from "@/lib/cart-store";
import { itemCount, subtotal, type MenuSnapshot } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { placeOrder } from "@/app/actions/place-order";

type Props = { currency: string; deliveryFee: number; fulfillment: string[]; open: boolean; menu: MenuSnapshot };
const NAMES: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };
const FIELD_OF: Record<string, string> = { name: "customerName", phone: "customerPhone", email: "customerEmail", table: "tableNumber", address: "deliveryAddress", note: "note" };
const EASE = [0.22, 1, 0.36, 1] as const;

export function CartBar({ currency, deliveryFee, fulfillment, open, menu }: Props) {
  const cart = useCart();
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const [scope, animate] = useAnimate();
  // One idempotency key per distinct order. A retry of the SAME order (e.g. after a dropped connection) reuses it,
  // so it can never create a duplicate; changing anything creates a fresh key.
  const attempt = useRef({ key: "", fingerprint: "" });
  const [f, setF] = useState({ name: "", phone: "", email: "", method: fulfillment[0] ?? "pickup", table: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string[] | undefined>>({});
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => { setNotes(cartActions.hydrate(menu)); }, [menu]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setToastMsg((e as CustomEvent<string>).detail); clearTimeout(t); t = setTimeout(() => setToastMsg(""), 2200); };
    window.addEventListener("mf:toast", on);
    return () => { window.removeEventListener("mf:toast", on); clearTimeout(t); };
  }, []);

  const count = itemCount(cart);
  const fee = f.method === "delivery" ? deliveryFee : 0;
  const total = subtotal(cart) + fee;

  function openSheet() {
    dlg.current?.showModal();
    animate(scope.current, { y: [48, 0], opacity: [0, 1] }, { duration: 0.4, ease: EASE });
  }
  async function closeSheet() {
    await animate(scope.current, { y: 36, opacity: 0 }, { duration: 0.2, ease: "easeIn" });
    dlg.current?.close();
  }

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
      <div className="toast-wrap" aria-live="polite">
        <AnimatePresence>
          {toastMsg && <motion.div key={toastMsg} className="toast" role="status" initial={{ opacity: 0, y: 16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.28, ease: EASE }}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{toastMsg}
          </motion.div>}
        </AnimatePresence>
      </div>
      <div className="cartbar-wrap">
        <AnimatePresence>
          {count > 0 && (
            <motion.button key="bar" type="button" className="cartbar" onClick={openSheet}
              initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }} whileTap={{ scale: 0.97 }}>
              <span className="cb-count"><motion.span key={count} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>{count}</motion.span></span>
              <span className="cb-label">View order ({count})</span>
              <strong>{formatMoney(subtotal(cart), currency)}</strong>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <dialog ref={dlg} className="sheet" aria-labelledby="cart-h" onClick={(e) => { if (e.target === dlg.current) void closeSheet(); }}
        onCancel={(e) => { e.preventDefault(); void closeSheet(); }}>
        <div ref={scope} className="sheet-in">
          <div className="sheet-top"><h2 id="cart-h">Your order</h2><button type="button" className="btn small" onClick={() => void closeSheet()}>Close</button></div>
          {notes.length > 0 && <div className="notice" role="status">{notes.map((n) => <p key={n}>{n}</p>)}</div>}
          {cart.length === 0 && <p className="muted">Your order is empty.</p>}
          <ul className="lines">
            {cart.map((l) => (
              <li key={l.key}>
                <div><b>{l.name}</b>{l.optionNames.length > 0 && <small>{l.optionNames.join(", ")}</small>}</div>
                <div className="qty">
                  <button type="button" aria-label={`Remove one ${l.name}`} onClick={() => cartActions.setQty(l.key, l.quantity - 1)}>−</button>
                  <span aria-live="polite">{l.quantity}</span>
                  <button type="button" aria-label={`Add one ${l.name}`} onClick={() => cartActions.setQty(l.key, l.quantity + 1)}>+</button>
                </div>
                <span className="line-total">{formatMoney(l.unitPrice * l.quantity, currency)}</span>
              </li>
            ))}
          </ul>
          {cart.length > 0 && (
            <form onSubmit={submit} noValidate>
              <fieldset className="methods"><legend>How do you want it?</legend>
                {fulfillment.map((m) => (<label key={m} className={f.method === m ? "on" : ""}><input type="radio" name="method" checked={f.method === m} onChange={() => setF({ ...f, method: m })} />{NAMES[m] ?? m}</label>))}
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
              <button className="btn solid block" disabled={busy || !open}>{busy ? "Placing order..." : "Place order"}</button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
