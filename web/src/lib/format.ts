const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const toNum = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === "number" ? v : Number(v));

/** Whole rupees, Indian grouping: ₹2,10,000 (never decimals, never lakh abbreviations). */
export const inr = (v: string | number | null | undefined) => inrFmt.format(toNum(v));

/** Hours with at most one decimal (AI-assisted hours are small numbers). */
export const hrs1 = (v: string | number | null | undefined) => `${toNum(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })} h`;
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
