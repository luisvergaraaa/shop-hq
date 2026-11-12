import Link from "next/link";
import { sql } from "@/lib/db";
import { LEAD_STAGES, leadStageLabel } from "@/lib/status";
import { fmtDate, todayLocal } from "@/lib/format";

const clean = (n: string) => (n || "").replace(/^\[listing\]\s*/, "");
const digits = (p: string) => (p || "").replace(/[^\d+]/g, "");

export default async function Leads({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "call" } = await searchParams;
  let rows: any[] = [];
  let st = { open: 0, call: 0, due: 0, booked: 0 };
  try {
    const today = todayLocal();
    rows = await sql`select id, name, phone, source, vehicle, notes, stage,
        to_char(follow_up_on, 'YYYY-MM-DD') as fu, to_char(coalesce(last_contact_at, created_at), 'YYYY-MM-DD') as last
      from leads
      where case when ${view}::text = 'all' then true
                 when ${view}::text = 'call' then stage in ('new','contacted') and phone <> ''
                 when ${view}::text = 'business' then source = 'Prospecting' and stage in ('new','contacted','quoted')
                 when ${view}::text in ('new','contacted','quoted','booked','won','lost') then stage = ${view}::text
                 else stage in ('new','contacted','quoted','booked') end
      order by case when follow_up_on is not null and follow_up_on <= ${today}::date then 0 else 1 end,
               case stage when 'new' then 0 when 'contacted' then 1 when 'quoted' then 2 else 3 end, created_at desc limit 300`;
    const s = await sql`select count(*) filter (where stage in ('new','contacted','quoted','booked')) as open,
        count(*) filter (where stage in ('new','contacted') and phone <> '') as call,
        count(*) filter (where follow_up_on <= ${today}::date and stage in ('new','contacted','quoted')) as due,
        count(*) filter (where stage = 'booked') as booked from leads`;
    st = { open: +s[0].open, call: +s[0].call, due: +s[0].due, booked: +s[0].booked };
  } catch {}
  const tabs: [string, string][] = [["call", "To call"], ["business", "Businesses"], ["open", "Open"], ...LEAD_STAGES.map((s) => [s.key, s.label] as [string, string]), ["all", "All"]];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div><h1>Leads</h1><p className="muted">People and businesses to call, with what they likely need worked on or diagnosed.</p></div>
        <div className="row wrap"><Link href="/hq/prospect" className="btn ghost">Find leads</Link><Link href="/hq/leads/new" className="btn">+ New lead</Link></div>
      </div>
      <div className="stats">
        <div className="stat"><div className="label">Open leads</div><div className="value">{st.open}</div></div>
        <div className="stat"><div className="label">Ready to call</div><div className="value">{st.call}</div></div>
        <div className="stat"><div className="label">Follow-ups due</div><div className="value" style={{ color: st.due ? "var(--accent-text)" : undefined }}>{st.due}</div></div>
        <div className="stat"><div className="label">Booked</div><div className="value">{st.booked}</div></div>
      </div>
      <div className="status-row">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/hq/leads?view=${k}`} className={`btn small ${view === k ? "" : "ghost"}`}>{label}</Link>
        ))}
      </div>
      <div className="card list">
        {rows.length === 0 && <p className="empty">Nothing here yet. Add a lead, import a list, or use Find leads.</p>}
        {rows.map((l) => (
          <div key={l.id} className="list-item">
            <Link href={`/hq/leads/${l.id}`} style={{ minWidth: 0, flex: 1 }}>
              <div className="row" style={{ gap: 8 }}>
                <h3>{l.name}</h3>
                <span className={`chip ${l.stage}`}>{leadStageLabel(l.stage)}</span>
                {l.source === "Prospecting" && <span className="chip">Business</span>}
              </div>
              <p className="small" style={{ marginTop: 2 }}>{clean(l.notes) || "No notes yet"}</p>
              <p className="muted small" style={{ marginTop: 2 }}>{[l.source !== "Prospecting" ? l.source : "", l.vehicle && l.vehicle !== "Business" ? l.vehicle : "", l.phone].filter(Boolean).join(" · ")}</p>
            </Link>
            <div style={{ textAlign: "right", display: "grid", gap: 6, justifyItems: "end" }}>
              {l.phone && <a href={`tel:${digits(l.phone)}`} className="btn small">Call</a>}
              {l.fu ? <div className="tiny" style={{ color: "var(--accent-text)" }}>Follow up {fmtDate(l.fu)}</div> : <div className="tiny">Added {fmtDate(l.last)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
