"use client";
import { useState } from "react";
import type { Item } from "@/lib/menu";
import { cartActions } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { round2 } from "@/lib/cart";

// "Extras" are optional multi-select; every other group is a required single choice.
export function AddButton({ item, currency }: { item: Item; currency: string }) {
  const opts = item.menu_item_options.filter((o) => o.is_available).sort((a, b) => a.sort_order - b.sort_order);
  const groups = [...new Set(opts.map((o) => o.group_name))];
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const chosen = groups.flatMap((g) => {
    const inG = opts.filter((o) => o.group_name === g);
    return g === "Extras" ? inG.filter((o) => sel[g]?.includes(o.id)) : [inG.find((o) => o.id === sel[g]?.[0]) ?? inG[0]];
  });
  const unit = round2(Number(item.price) + chosen.reduce((s, o) => s + Number(o.extra_price), 0));

  function add() {
    cartActions.add({ itemId: item.id, name: item.name, unitPrice: unit, quantity: 1, optionIds: chosen.map((o) => o.id), optionNames: chosen.map((o) => o.name) });
    setOpen(false);
  }
  if (groups.length === 0) return <button className="btn add" onClick={add}>Add to order</button>;
  return (
    <div>
      <button className="btn add" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Choose and add"}</button>
      {open && (
        <div className="choices">
          {groups.map((g) => (
            <fieldset key={g}><legend>{g === "Extras" ? "Extras (optional)" : g}</legend>
              {opts.filter((o) => o.group_name === g).map((o, i) => {
                const multi = g === "Extras";
                const checked = multi ? !!sel[g]?.includes(o.id) : (sel[g]?.[0] ?? opts.filter((x) => x.group_name === g)[0].id) === o.id;
                return (
                  <label key={o.id}>
                    <input type={multi ? "checkbox" : "radio"} name={`${item.id}-${g}`} checked={checked}
                      onChange={() => setSel({ ...sel, [g]: multi ? (checked ? sel[g].filter((x) => x !== o.id) : [...(sel[g] ?? []), o.id]) : [o.id] })} />
                    {o.name}{Number(o.extra_price) > 0 && ` (+${formatMoney(o.extra_price, currency)})`}
                  </label>
                );
              })}
            </fieldset>
          ))}
          <button className="btn solid" onClick={add}>Add for {formatMoney(unit, currency)}</button>
        </div>
      )}
    </div>
  );
}
