export type CartLine = { key: string; itemId: string; name: string; unitPrice: number; quantity: number; optionIds: string[]; optionNames: string[] };

const cap = (n: number) => Math.max(1, Math.min(99, Math.floor(n)));
export const lineKey = (itemId: string, optionIds: string[]) => `${itemId}:${[...optionIds].sort().join(",")}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function addLine(cart: CartLine[], line: Omit<CartLine, "key">): CartLine[] {
  const key = lineKey(line.itemId, line.optionIds);
  if (cart.some((l) => l.key === key))
    return cart.map((l) => (l.key === key ? { ...l, quantity: cap(l.quantity + line.quantity) } : l));
  return [...cart, { ...line, key, quantity: cap(line.quantity) }];
}
export function setQuantity(cart: CartLine[], key: string, q: number): CartLine[] {
  if (!(q >= 1)) return cart.filter((l) => l.key !== key);
  return cart.map((l) => (l.key === key ? { ...l, quantity: cap(q) } : l));
}
export const subtotal = (cart: CartLine[]) => round2(cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
export const itemCount = (cart: CartLine[]) => cart.reduce((n, l) => n + l.quantity, 0);

const isStr = (x: unknown): x is string => typeof x === "string";
/** The cart is read back from localStorage, which can hold anything (old versions, edits, corruption). */
export function sanitizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const l = r as Record<string, unknown>;
    if (!isStr(l.itemId) || !isStr(l.name) || !Number.isFinite(l.unitPrice) || !Number.isFinite(l.quantity)) continue;
    const optionIds = Array.isArray(l.optionIds) ? l.optionIds.filter(isStr) : [];
    const optionNames = Array.isArray(l.optionNames) ? l.optionNames.filter(isStr) : [];
    out.push({ key: lineKey(l.itemId, optionIds), itemId: l.itemId, name: l.name, unitPrice: Math.max(0, l.unitPrice as number),
      quantity: cap(l.quantity as number), optionIds, optionNames });
  }
  return out.slice(0, 50);
}

/** What the live menu says about each item. Built on the server and passed to the cart. */
export type MenuSnapshot = Record<string, { price: number; available: boolean; options: Record<string, { extra: number; available: boolean }> }>;

/**
 * A cart saved yesterday may hold items that are now sold out or repriced. Drop what can't be ordered, refresh
 * prices, and say what changed, so the customer isn't surprised by a failed order.
 */
export function reconcileCart(cart: CartLine[], menu: MenuSnapshot): { cart: CartLine[]; notes: string[] } {
  const notes: string[] = [];
  const next: CartLine[] = [];
  for (const l of cart) {
    const m = menu[l.itemId];
    if (!m || !m.available || l.optionIds.some((id) => !m.options[id]?.available)) {
      notes.push(`${l.name} is no longer available and was removed.`);
      continue;
    }
    const unitPrice = round2(m.price + l.optionIds.reduce((s, id) => s + m.options[id].extra, 0));
    if (unitPrice !== round2(l.unitPrice)) notes.push(`The price of ${l.name} changed.`);
    next.push({ ...l, unitPrice });
  }
  return { cart: next, notes };
}
