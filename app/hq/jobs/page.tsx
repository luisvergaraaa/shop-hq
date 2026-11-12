import Link from "next/link";
import { JobRow } from "@/components/JobRow";
import { listJobs } from "../data";

export default async function Jobs({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "open" } = await searchParams;
  let rows: any[] = [];
  try { rows = await listJobs(view === "all" ? "all" : "open"); } catch {}
  return (
    <div>
      <div className="page-head">
        <h1>Jobs</h1>
        <Link href="/hq/jobs/new" className="btn">+ New job</Link>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <Link href="/hq/jobs" className={`btn small ${view === "all" ? "ghost" : ""}`}>Active</Link>
        <Link href="/hq/jobs?view=all" className={`btn small ${view === "all" ? "" : "ghost"}`}>All jobs</Link>
      </div>
      <div className="card list">
        {rows.length === 0 ? <p className="empty">No jobs here yet.</p> : rows.map((j) => <JobRow key={j.id} j={j} />)}
      </div>
    </div>
  );
}
