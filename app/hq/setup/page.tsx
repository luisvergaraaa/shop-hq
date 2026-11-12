import { aiEnabled } from "@/lib/ai";
import { hasDb } from "@/lib/db";
import { SHOP } from "@/lib/config";
import { initDatabase } from "../actions";
import { loadSampleData, clearSampleData } from "../demo-actions";

export default async function Setup({ searchParams }: { searchParams: Promise<{ done?: string; sample?: string }> }) {
  const { done, sample } = await searchParams;
  const checks = [
    ["Database connected (DATABASE_URL)", hasDb()],
    ["Login password set (ADMIN_PASSWORD)", (process.env.ADMIN_PASSWORD || "").length >= 8],
    ["Shop name set (SHOP_NAME)", Boolean(process.env.SHOP_NAME)],
    ["Shop phone set (SHOP_PHONE)", Boolean(process.env.SHOP_PHONE)],
    ["AI connected (ANTHROPIC_API_KEY)", aiEnabled()],
    ["Lead finder on (GOOGLE_PLACES_KEY)", Boolean(process.env.GOOGLE_PLACES_KEY)],
    ["Google review link set (REVIEW_LINK)", Boolean(process.env.REVIEW_LINK)],
    ["Daily auto-check on (CRON_SECRET)", Boolean(process.env.CRON_SECRET)],
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
      {sample === "exists" && <div className="notice">Sample data is already loaded.</div>}
      {sample === "services" && <div className="notice">Tap "Set up database" first so your services exist, then load sample data.</div>}
      {sample === "cleared" && <div className="notice">Sample data removed. Your real data was not touched.</div>}
      <div className="card stack">
        <h2>Sample data</h2>
        <p className="muted small">Fills the app with made-up customers, jobs, leads, drafts and expenses (fictional 555 phone numbers) so you can see it with a busy week. Remove it any time with one tap; real entries are never touched.</p>
        <div className="row wrap">
          <form action={loadSampleData}><button className="btn" disabled={!hasDb()}>Load sample data</button></form>
          <form action={clearSampleData}><button className="btn ghost">Remove sample data</button></form>
        </div>
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <h2>Your public pages</h2>
        <p className="small">Website: <a href="/" style={{ color: "var(--teal)" }}>/</a> · Booking: <a href="/book" style={{ color: "var(--teal)" }}>/book</a></p>
        <p className="muted small">Time zone: {SHOP.tz}</p>
      </div>
    </div>
  );
}
