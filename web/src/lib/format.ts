const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const toNum = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === "number" ? v : Number(v));

/** ₹2,10,000 */
export const inr = (v: string | number | null | undefined) => inrFmt.format(toNum(v));

/** ₹3.2 L / ₹1.4 Cr / ₹85,000 */
export function inrShort(v: string | number | null | undefined) {
  const n = toNum(v);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return inr(n);
}

export const hrs = (v: string | number | null | undefined) => `${numFmt.format(toNum(v))} h`;
export const num = (v: string | number | null | undefined) => numFmt.format(toNum(v));
export const pct = (v: string | number | null | undefined, digits = 0) => `${(toNum(v) * 100).toFixed(digits)}%`;

export function date(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
