import { sql } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { askAssistant } from "../crm-actions";

export const maxDuration = 60;

const IDEAS = ["Who should I follow up with today?", "How much money is unpaid and from whom?", "Which lead source brings the most jobs?", "What did I earn this week?"];

export default async function Assistant({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  let log: any[] = [];
  try { log = await sql`select question, answer from ai_log where kind = 'chat' order by id desc limit 10`; } catch {}
  const ai = aiEnabled();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Torque</h1><p className="muted">Ask anything about your leads, jobs and money.</p></div></div>
      {!ai && <div className="notice">AI isn't connected yet. Add <b>ANTHROPIC_API_KEY</b> in Vercel → Settings → Environment Variables, then redeploy. Drafts still work with simple templates.</div>}
      {e === "fail" && <div className="notice">The AI didn't answer. Try again in a moment.</div>}
      <form action={askAssistant} className="card stack">
        <textarea name="q" required placeholder="Ask a question…" style={{ minHeight: 80 }} />
        <div className="row wrap"><button className="btn" disabled={!ai}>Ask Torque</button></div>
        <p className="small">Want new customers to call? <a href="/hq/prospect" style={{ color: "var(--teal)" }}>Find local businesses in the 309 →</a></p>
        <p className="tiny">Ideas: {IDEAS.join(" · ")}</p>
      </form>
      {log.map((r, i) => (
        <div key={i} className="card stack" style={{ gap: 8 }}>
          <div className="bubble out" style={{ alignSelf: "flex-end" }}>{r.question}</div>
          <div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{r.answer}</div>
        </div>
      ))}
    </div>
  );
}
