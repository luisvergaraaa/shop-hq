import { sql } from "@/lib/db";
import { LEAD_STAGES } from "@/lib/status";

export default async function Funnel() {
  let stages: any[] = [], sources: any[] = [];
  try {
    stages = await sql`select stage, count(*)::int as n from leads group by stage`;
    sources = await sql`select source, count(*)::int as n, count(*) filter (where stage in ('booked','won'))::int as won from leads group by source order by n desc`;
  } catch {}
  const by: Record<string, number> = {};
  for (const s of stages) by[s.stage] = s.n;
  const total = stages.reduce((a, s) => a + s.n, 0);
  const closed = (by.won || 0) + (by.booked || 0);
  const max = Math.max(1, ...LEAD_STAGES.map((s) => by[s.key] || 0));
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Funnel</h1><p className="muted">Where your leads are, and which sources actually turn into jobs.</p></div></div>
      <div className="stats">
        <div className="stat"><div className="label">Total leads</div><div className="value">{total}</div></div>
        <div className="stat"><div className="label">Booked or won</div><div className="value">{closed}</div></div>
        <div className="stat"><div className="label">Close rate</div><div className="value">{total ? Math.round((closed / total) * 100) : 0}%</div></div>
        <div className="stat"><div className="label">Lost</div><div className="value">{by.lost || 0}</div></div>
      </div>
      <div className="card stack">
        <h2>By stage</h2>
        {LEAD_STAGES.map((s) => (
          <div key={s.key} className="row" style={{ gap: 10 }}>
            <span style={{ width: 90 }} className="small">{s.label}</span>
            <div style={{ flex: 1, background: "var(--border)", borderRadius: 6, height: 12 }}>
              <div style={{ width: `${((by[s.key] || 0) / max) * 100}%`, height: 12, borderRadius: 6, background: "var(--accent)" }} />
            </div>
            <strong style={{ width: 30, textAlign: "right" }}>{by[s.key] || 0}</strong>
          </div>
        ))}
      </div>
      <div className="card list">
        <h2>By source</h2>
        {sources.length === 0 && <p className="empty">No leads yet.</p>}
        {sources.map((s) => (
          <div key={s.source} className="list-item"><span>{s.source}</span><span className="muted small">{s.n} leads · {s.won} booked/won</span></div>
        ))}
      </div>
    </div>
  );
}
