import { hasDb } from "@/lib/db";
import { SHOP } from "@/lib/config";
import { initDatabase } from "../actions";

export default async function Setup({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const checks = [
    ["Database connected (DATABASE_URL)", hasDb()],
    ["Login password set (ADMIN_PASSWORD)", (process.env.ADMIN_PASSWORD || "").length >= 8],
    ["Shop name set (SHOP_NAME)", Boolean(process.env.SHOP_NAME)],
    ["Shop phone set (SHOP_PHONE)", Boolean(process.env.SHOP_PHONE)],
  ] as const;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1>Setup</h1>
      {done && <div className="notice">Database is ready. Starter services were added; edit prices under Services & pricing.</div>}
      <div className="card list">
        {checks.map(([label, ok]) => (
          <div key={label} className="list-item"><span>{label}</span><span className={`chip ${ok ? "complete" : "critical"}`}>{ok ? "Done" : "Missing"}</span></div>
        ))}
      </div>
      <form action={initDatabase} className="card stack">
        <h2>Prepare the database</h2>
        <p className="muted small">Creates your tables and adds a few starter services. Safe to run again; it never deletes anything.</p>
        <button className="btn" disabled={!hasDb()}>Set up database</button>
      </form>
      <div className="card stack" style={{ gap: 6 }}>
        <h2>Your public pages</h2>
        <p className="small">Website: <a href="/" style={{ color: "var(--teal)" }}>/</a> · Booking: <a href="/book" style={{ color: "var(--teal)" }}>/book</a></p>
        <p className="muted small">Time zone: {SHOP.tz}</p>
      </div>
    </div>
  );
}
