"use client";
// Shared state for everything that can open a dish: the menu grid, signature rail, gallery and hero special.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimate } from "motion/react";
import type { Category, Item, Option } from "@/lib/menu";
import { tagInfo } from "@/lib/tags";
import { formatMoney } from "@/lib/money";
import { round2 } from "@/lib/cart";
import { cartActions, toast } from "@/lib/cart-store";
import { DishArt } from "@/components/art/DishArt";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const optionsOf = (it: Item) => it.menu_item_options.filter((o) => o.is_available).sort((a, b) => a.sort_order - b.sort_order);

export function Art({ item, category }: { item: Item; category: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return item.image_url ? <img src={item.image_url} alt="" loading="lazy" decoding="async" /> : <DishArt name={item.name} category={category} />;
}
export function Tags({ tags }: { tags: string[] }) {
  return <>{tags.map((t) => { const i = tagInfo(t); return i ? <span key={t} className={`tag ${i.tone}`}>{i.label}</span> : null; })}</>;
}
export function quickAdd(item: Item) {
  cartActions.add({ itemId: item.id, name: item.name, unitPrice: Number(item.price), quantity: 1, optionIds: [], optionNames: [] });
  toast(`Added ${item.name}`);
}
export function PlusIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
}

type Entry = { item: Item; category: string };
type Ctx = { categories: Category[]; all: Entry[]; currency: string; canOrder: boolean; open: (i: Item, category: string) => void };
const MenuCtx = createContext<Ctx | null>(null);
export function useMenu() { const c = useContext(MenuCtx); if (!c) throw new Error("MenuProvider is missing"); return c; }

export function MenuProvider({ categories, currency, canOrder, children }: { categories: Category[]; currency: string; canOrder: boolean; children: React.ReactNode }) {
  const [shown, setShown] = useState<Entry | null>(null);
  const all = useMemo(() => categories.flatMap((c) => c.items.map((item) => ({ item, category: c.name }))), [categories]);
  const value = useMemo(() => ({ categories, all, currency, canOrder, open: (item: Item, category: string) => setShown({ item, category }) }), [categories, all, currency, canOrder]);
  return (
    <MenuCtx.Provider value={value}>
      {children}
      {shown && <ItemSheet key={shown.item.id} item={shown.item} category={shown.category} currency={currency} canOrder={canOrder} onClose={() => setShown(null)} />}
    </MenuCtx.Provider>
  );
}

function ItemSheet({ item, category, currency, canOrder, onClose }: { item: Item; category: string; currency: string; canOrder: boolean; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [scope, animate] = useAnimate();
  const opts = optionsOf(item);
  const groups = [...new Set(opts.map((o) => o.group_name))];
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    dlg.current?.showModal();
    animate(scope.current, { y: [56, 0], opacity: [0, 1] }, { duration: 0.42, ease: EASE });
  }, [animate, scope]);
  async function close() {
    await animate(scope.current, { y: 40, opacity: 0 }, { duration: 0.22, ease: "easeIn" });
    dlg.current?.close();
  }
  const chosen: Option[] = groups.flatMap((g) => {
    const inG = opts.filter((o) => o.group_name === g);
    return g === "Extras" ? inG.filter((o) => sel[g]?.includes(o.id)) : [inG.find((o) => o.id === sel[g]?.[0]) ?? inG[0]];
  });
  const unit = round2(Number(item.price) + chosen.reduce((s, o) => s + Number(o.extra_price), 0));
  function add() {
    cartActions.add({ itemId: item.id, name: item.name, unitPrice: unit, quantity: qty, optionIds: chosen.map((o) => o.id), optionNames: chosen.map((o) => o.name) });
    toast(`Added ${qty} × ${item.name}`);
    void close();
  }
  return (
    <dialog ref={dlg} className="sheet item-sheet" aria-labelledby="sheet-title" onClose={onClose}
      onCancel={(e) => { e.preventDefault(); void close(); }} onClick={(e) => { if (e.target === dlg.current) void close(); }}>
      <div ref={scope} className="sheet-in">
        <div className="sheet-art"><Art item={item} category={category} />
          <button type="button" className="sheet-x" onClick={() => void close()} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="sheet-body">
          <div className="card-tags"><Tags tags={item.tags} /></div>
          <h2 id="sheet-title">{item.name}</h2>
          <p className="muted">{item.description}</p>
          {groups.map((g) => (
            <fieldset key={g} className="opt-group"><legend>{g === "Extras" ? "Extras (optional)" : `${g} (choose one)`}</legend>
              {opts.filter((o) => o.group_name === g).map((o) => {
                const multi = g === "Extras";
                const checked = multi ? !!sel[g]?.includes(o.id) : (sel[g]?.[0] ?? opts.find((x) => x.group_name === g)!.id) === o.id;
                return (
                  <label key={o.id} className={`opt${checked ? " on" : ""}`}>
                    <input type={multi ? "checkbox" : "radio"} name={`${item.id}-${g}`} checked={checked}
                      onChange={() => setSel({ ...sel, [g]: multi ? (checked ? (sel[g] ?? []).filter((x) => x !== o.id) : [...(sel[g] ?? []), o.id]) : [o.id] })} />
                    <span>{o.name}</span><span className="muted">{Number(o.extra_price) > 0 ? `+${formatMoney(o.extra_price, currency)}` : "Included"}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
          {canOrder && item.is_available ? (
            <div className="sheet-actions">
              <div className="qty big" role="group" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <motion.span key={qty} initial={{ scale: 1.35 }} animate={{ scale: 1 }} aria-live="polite">{qty}</motion.span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(20, qty + 1))}>+</button>
              </div>
              <button type="button" className="btn solid grow" onClick={add}>Add to order · {formatMoney(unit * qty, currency)}</button>
            </div>
          ) : <p className="notice">{item.is_available ? "Not taking orders right now." : "Sold out today."}</p>}
        </div>
      </div>
    </dialog>
  );
}
