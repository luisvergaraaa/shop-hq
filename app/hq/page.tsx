import Link from "next/link";
import { sql } from "@/lib/db";
import { money, todayLocal, weekStart, fmtWhen } from "@/lib/format";
import { JobRow } from "@/components/JobRow";
import { listJobs } from "./data";

async function load() {
  const today = todayLocal();
  const ws = weekStart(today);
  try {
    const [jobs, nums, tasks] = await Promise.all([
      listJobs("today", today),
      sql`select
        (select count(*) from jobs where status = 'requested')::int as requested,
        (select coalesce(sum(li.qty*li.unit_cents),0)::int from line_items li join jobs j on j.id = li.job_id where j.status = 'complete' and j.paid_at is null) as unpaid,
        (select coalesce(sum(paid_cents),0)::int from jobs where paid_at >= ${ws}::date) as week_rev,
        (select coalesce(sum(amount_cents),0)::int from expenses where spent_on >= ${ws}::date) as week_exp`,
      sql`select id, title, to_char(due_on,'YYYY-MM-DD') as due from tasks where not done order by due_on nulls last, id limit 5`,
    ]);
    return { today, jobs, n: nums[0], tasks };
  } catch {
    return { today, jobs: [], n: { requested: 0, unpaid: 0, week_rev: 0, week_exp: 0 }, tasks: [] };
  }
}

export default async function Overview() {
  const { today, jobs, n, tasks } = await load();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Overview</h1>
          <p className="muted">{fmtWhen(today, { date: true, time: false })}</p>
        </div>
        <Link href="/hq/jobs/new" className="btn">+ New job</Link>
      </div>

      <div className="stats">
        <Link href="/hq/requests" className="stat"><div className="label">Waiting requests</div><div className="value" style={{ color: n.requested ? "var(--accent-text)" : undefined }}>{n.requested}</div></Link>
        <div className="stat"><div className="label">Jobs today</div><div className="value">{jobs.length}</div></div>
        <Link href="/hq/invoices" className="stat"><div className="label">Unpaid</div><div className="value">{money(n.unpaid)}</div></Link>
        <Link href="/hq/report" className="stat"><div className="label">Profit this week</div><div className="value">{money(n.week_rev - n.week_exp)}</div></Link>
      </div>

      <div className="card">
        <div className="row between"><h2>Today's route</h2><Link href="/hq/calendar" className="muted small">Calendar →</Link></div>
        <div className="list" style={{ marginTop: 6 }}>
          {jobs.length === 0 ? <p className="empty">Nothing scheduled today.</p> : jobs.map((j: any) => <JobRow key={j.id} j={j} showDate={false} />)}
        </div>
      </div>

      <div className="card">
        <div className="row between"><h2>Tasks</h2><Link href="/hq/tasks" className="muted small">All tasks →</Link></div>
        <div className="list" style={{ marginTop: 6 }}>
          {tasks.length === 0 ? <p className="empty">You're all caught up.</p> : tasks.map((t: any) => (
            <div key={t.id} className="list-item"><span>{t.title}</span>{t.due && <span className="muted small">{fmtWhen(t.due, { date: true, time: false })}</span>}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
