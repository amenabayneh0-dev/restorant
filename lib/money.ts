export function formatMoney(amount: number | string, currency: string): string {
  const n = Number(amount);
  const hasCents = Math.abs(n % 1) > 0;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })} ${currency}`;
}
