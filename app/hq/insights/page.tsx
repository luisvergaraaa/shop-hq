import { sql } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { generateInsights } from "../crm-actions";

export const maxDuration = 60;

export default async function Insights({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  let rows: any[] = [];
  try { rows = await sql`select answer, to_char(created_at at time zone ${process.env.SHOP_TIMEZONE || "America/Chicago"}, 'Mon DD, HH12:MI AM') as at from ai_log where kind = 'insight' order by id desc limit 5`; } catch {}
  const ai = aiEnabled();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>Insights</h1><p className="muted">What's working, what's slipping, and what to do this week.</p></div>
        <form action={generateInsights}><button className="btn" disabled={!ai}>Generate insights</button></form>
      </div>
      {!ai && <div className="notice">Connect the AI (ANTHROPIC_API_KEY) to generate insights.</div>}
      {e === "fail" && <div className="notice">The AI didn't answer. Try again.</div>}
      {rows.length === 0 && <div className="card"><p className="empty">No insights yet. Tap Generate insights.</p></div>}
      {rows.map((r, i) => (
        <div key={i} className="card stack" style={{ gap: 8 }}>
          <span className="tiny">{r.at}</span>
          <div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{r.answer}</div>
        </div>
      ))}
    </div>
  );
}
