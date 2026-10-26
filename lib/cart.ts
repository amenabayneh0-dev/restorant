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
