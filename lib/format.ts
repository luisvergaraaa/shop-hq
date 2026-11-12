import { SHOP } from "./config";

export function money(cents: number | string | null | undefined) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "2026-11-12T09:30" (shop-local, no zone) -> "Thu, Nov 12 · 9:30 AM" */
export function fmtWhen(s?: string | null, opts: { date?: boolean; time?: boolean } = { date: true, time: true }) {
  if (!s) return "Not scheduled";
  const d = new Date(s.length <= 10 ? s + "T00:00:00Z" : s + ":00Z");
  const parts: string[] = [];
  if (opts.date !== false) parts.push(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }));
  if (opts.time !== false && s.length > 10) parts.push(d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }));
  return parts.join(" · ");
}

export function fmtDate(s?: string | null) {
  if (!s) return "";
  return fmtWhen(String(s).slice(0, 10), { date: true, time: false });
}

/** Today's date in the shop's time zone, as YYYY-MM-DD */
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso` */
export function weekStart(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
}

export function vehicleName(v: { year?: string; make?: string; model?: string }) {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle not listed";
}

export function cents(input: FormDataEntryValue | null) {
  const n = parseFloat(String(input || "0").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
