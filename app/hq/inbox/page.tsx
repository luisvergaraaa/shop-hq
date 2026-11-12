import Link from "next/link";
import { sql } from "@/lib/db";
import { logIncoming } from "../crm-actions";

export const maxDuration = 60;

export default async function Inbox() {
  let rows: any[] = [];
  try {
    rows = await sql`select l.id, l.name, l.phone, l.stage,
        (select body from messages m where m.lead_id = l.id order by m.id desc limit 1) as last_body,
        (select direction from messages m where m.lead_id = l.id order by m.id desc limit 1) as last_dir,
        to_char((select max(created_at) from messages m where m.lead_id = l.id) at time zone ${process.env.SHOP_TIMEZONE || "America/Chicago"}, 'Mon DD HH12:MI AM') as at
      from leads l where exists (select 1 from messages m where m.lead_id = l.id)
      order by (select max(id) from messages m where m.lead_id = l.id) desc limit 100`;
  } catch {}
  const waiting = rows.filter((r) => r.last_dir === "in");
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Inbox</h1><p className="muted">Paste a text or message you got. I'll file it under the right person and draft a reply for you to approve.</p></div></div>
      <form action={logIncoming} className="card stack">
        <h2>Log a message you received</h2>
        <div className="fields three">
          <div className="field"><label>Name</label><input name="name" placeholder="Who texted?" /></div>
          <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
          <div className="field"><label>Where from</label><select name="source" defaultValue="Text"><option>Text</option><option>Facebook</option><option>Phone</option><option>Website</option><option>Referral</option><option>Other</option></select></div>
        </div>
        <div className="field"><label>Their message</label><textarea name="body" required placeholder="Hey, my check engine light just came on…" /></div>
        <button className="btn">Log it and draft a reply</button>
      </form>
      <div className="card list">
        <div className="row between"><h2>Conversations</h2>{waiting.length > 0 && <span className="chip requested">{waiting.length} need a reply</span>}</div>
        {rows.length === 0 && <p className="empty">No messages yet.</p>}
        {rows.map((r) => (
          <Link key={r.id} href={`/hq/leads/${r.id}`} className="list-item">
            <div style={{ minWidth: 0 }}>
              <h3>{r.name}</h3>
              <p className="muted small" style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420 }}>{r.last_dir === "out" ? "You: " : ""}{r.last_body}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tiny">{r.at}</div>
              {r.last_dir === "in" && <span className="chip requested">Needs reply</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
