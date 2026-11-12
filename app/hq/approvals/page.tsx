import { sql } from "@/lib/db";
import { DraftCard } from "@/components/DraftCard";
import { runAutomationsNow } from "../crm-actions";

export const maxDuration = 60;

export default async function Approvals({ searchParams }: { searchParams: Promise<{ made?: string }> }) {
  const { made } = await searchParams;
  let rows: any[] = [];
  try { rows = await sql`select * from approvals where status = 'pending' order by id desc limit 100`; } catch {}
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>Approvals</h1><p className="muted">Everything the AI writes waits here. Nothing is sent until you send it.</p></div>
        <form action={runAutomationsNow}><button className="btn">Check for new drafts</button></form>
      </div>
      {made !== undefined && <div className="notice">{Number(made) > 0 ? `${made} new draft${Number(made) === 1 ? "" : "s"} added.` : "Nothing new needs a message right now."}</div>}
      {rows.length === 0 && <div className="card"><p className="empty">You're all caught up.</p></div>}
      {rows.map((a) => <DraftCard key={a.id} a={a} />)}
    </div>
  );
}
