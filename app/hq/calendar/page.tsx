import { addDays, fmtWhen, todayLocal } from "@/lib/format";
import { JobRow } from "@/components/JobRow";
import { listJobs } from "../data";

export default async function Calendar() {
  const start = todayLocal();
  const end = addDays(start, 13);
  let jobs: any[] = [];
  try { jobs = await listJobs("range", start, end); } catch {}
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  return (
    <div>
      <div className="page-head"><div><h1>Calendar</h1><p className="muted">Next two weeks</p></div></div>
      <div className="stack">
        {days.map((d) => {
          const list = jobs.filter((j) => j.at?.startsWith(d));
          return (
            <div key={d} className="card" style={{ padding: "14px 18px" }}>
              <div className="row between">
                <h3 style={{ color: d === start ? "var(--accent-text)" : undefined }}>{d === start ? "Today · " : ""}{fmtWhen(d, { date: true, time: false })}</h3>
                <span className="muted small">{list.length ? `${list.length} job${list.length > 1 ? "s" : ""}` : "Open"}</span>
              </div>
              {list.length > 0 && <div className="list" style={{ marginTop: 4 }}>{list.map((j) => <JobRow key={j.id} j={j} showDate={false} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
