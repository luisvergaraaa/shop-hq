import Link from "next/link";
import { sql } from "@/lib/db";
import { LEAD_STAGES, leadStageLabel } from "@/lib/status";
import { fmtDate } from "@/lib/format";

export default async function Leads({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "open" } = await searchParams;
  let rows: any[] = [];
  try {
    rows = await sql`select id, name, phone, source, vehicle, stage,
        to_char(follow_up_on, 'YYYY-MM-DD') as fu, to_char(coalesce(last_contact_at, created_at), 'YYYY-MM-DD') as last
      from leads
      where case when ${view}::text = 'all' then true
                 when ${view}::text in ('new','contacted','quoted','booked','won','lost') then stage = ${view}::text
                 else stage in ('new','contacted','quoted','booked') end
      order by case stage when 'new' then 0 when 'contacted' then 1 when 'quoted' then 2 else 3 end, created_at desc limit 300`;
  } catch {}
  const tabs = [["open", "Open"], ...LEAD_STAGES.map((s) => [s.key, s.label]), ["all", "All"]];
  return (
    <div>
      <div className="page-head">
        <div><h1>Leads</h1><p className="muted">Everyone who's asked about a visit, from first message to paid job.</p></div>
        <Link href="/hq/leads/new" className="btn">+ New lead</Link>
      </div>
      <div className="status-row" style={{ marginBottom: 14 }}>
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/hq/leads?view=${k}`} className={`btn small ${view === k ? "" : "ghost"}`}>{label}</Link>
        ))}
      </div>
      <div className="card list">
        {rows.length === 0 && <p className="empty">No leads here yet. Add one, import a list, or log a message in Inbox.</p>}
        {rows.map((l) => (
          <Link key={l.id} href={`/hq/leads/${l.id}`} className="list-item">
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <h3>{l.name}</h3>
                <span className={`chip ${l.stage}`}>{leadStageLabel(l.stage)}</span>
              </div>
              <p className="muted small" style={{ marginTop: 2 }}>{l.source}{l.vehicle ? ` · ${l.vehicle}` : ""}{l.phone ? ` · ${l.phone}` : ""}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tiny">Last contact {fmtDate(l.last)}</div>
              {l.fu && <div className="tiny" style={{ color: "var(--accent-text)" }}>Follow up {fmtDate(l.fu)}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
