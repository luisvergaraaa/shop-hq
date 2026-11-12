import Link from "next/link";
import { sql } from "@/lib/db";
import { money, addDays, weekStart, todayLocal, fmtWhen } from "@/lib/format";

export default async function Report({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const offset = Math.min(0, Number(w) || 0);
  const ws = addDays(weekStart(todayLocal()), offset * 7);
  const we = addDays(ws, 7);
  const histStart = addDays(ws, -49);
  let n: any = { jobs: 0, rev: 0, exp: 0, requests: 0 }, top: any[] = [], hist: any[] = [];
  try {
    const [a, b, c] = await Promise.all([
      sql`select
        (select count(*) from jobs where paid_at >= ${ws}::date and paid_at < ${we}::date)::int as jobs,
        (select coalesce(sum(paid_cents),0)::int from jobs where paid_at >= ${ws}::date and paid_at < ${we}::date) as rev,
        (select coalesce(sum(amount_cents),0)::int from expenses where spent_on >= ${ws}::date and spent_on < ${we}::date) as exp,
        (select count(*) from jobs where created_at >= ${ws}::date and created_at < ${we}::date)::int as requests`,
      sql`select coalesce(s.name,'Other') as name, count(*)::int as n, sum(j.paid_cents)::int as rev
        from jobs j left join services s on s.id = j.service_id
        where j.paid_at >= ${ws}::date and j.paid_at < ${we}::date group by 1 order by rev desc limit 5`,
      sql`select to_char(gs::date,'YYYY-MM-DD') as wk,
          (select coalesce(sum(paid_cents),0)::int from jobs where paid_at >= gs and paid_at < gs + interval '7 days') as rev,
          (select coalesce(sum(amount_cents),0)::int from expenses where spent_on >= gs::date and spent_on < (gs + interval '7 days')::date) as exp
        from generate_series(${histStart}::date, ${ws}::date, interval '7 days') gs order by gs`,
    ]);
    n = a[0]; top = b; hist = c;
  } catch {}
  const max = Math.max(1, ...hist.map((h) => Math.max(h.rev, h.exp)));
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>Weekly report</h1><p className="muted">Week of {fmtWhen(ws, { date: true, time: false })}</p></div>
        <div className="row">
          <Link className="btn ghost small" href={`/hq/report?w=${offset - 1}`}>← Prev</Link>
          {offset < 0 && <Link className="btn ghost small" href={`/hq/report?w=${offset + 1}`}>Next →</Link>}
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="label">Revenue</div><div className="value">{money(n.rev)}</div></div>
        <div className="stat"><div className="label">Expenses</div><div className="value">{money(n.exp)}</div></div>
        <div className="stat"><div className="label">Profit</div><div className="value" style={{ color: n.rev - n.exp >= 0 ? "var(--ok)" : "var(--danger)" }}>{money(n.rev - n.exp)}</div></div>
        <div className="stat"><div className="label">Avg ticket</div><div className="value">{money(n.jobs ? n.rev / n.jobs : 0)}</div></div>
      </div>
      <p className="muted small">{n.jobs} paid job{n.jobs === 1 ? "" : "s"} · {n.requests} new booking{n.requests === 1 ? "" : "s"} this week</p>
      <div className="card stack">
        <h2>Last 8 weeks</h2>
        <div className="row small muted"><span style={{ color: "var(--accent-text)" }}>■ Revenue</span><span style={{ color: "var(--teal)" }}>■ Expenses</span></div>
        {hist.map((h) => (
          <div key={h.wk} className="stack" style={{ gap: 4 }}>
            <div className="row between small"><span>{fmtWhen(h.wk, { date: true, time: false })}</span><span className="num">{money(h.rev)} / {money(h.exp)}</span></div>
            <div className="bar"><span style={{ width: `${(h.rev / max) * 100}%` }} /></div>
            <div className="bar teal"><span style={{ width: `${(h.exp / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Top services this week</h2>
        <div className="list" style={{ marginTop: 6 }}>
          {top.length === 0 && <p className="empty">No paid jobs this week.</p>}
          {top.map((t) => <div key={t.name} className="list-item"><span>{t.name} <span className="muted small">× {t.n}</span></span><span className="num" style={{ fontWeight: 800 }}>{money(t.rev)}</span></div>)}
        </div>
      </div>
    </div>
  );
}
