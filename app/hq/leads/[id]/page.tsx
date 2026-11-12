import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { LEAD_SOURCES, LEAD_STAGES, leadStageLabel } from "@/lib/status";
import { DraftCard } from "@/components/DraftCard";
import { updateLead, setLeadStage, deleteLead, convertLead, logMessage, draftFor } from "../../crm-actions";

export const maxDuration = 60;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  const rows = leadId ? await sql`select *, to_char(follow_up_on, 'YYYY-MM-DD') as fu from leads where id = ${leadId}` : [];
  if (!rows.length) notFound();
  const l = rows[0];
  const [msgs, drafts] = await Promise.all([
    sql`select direction, body, to_char(created_at at time zone ${process.env.SHOP_TIMEZONE || "America/Chicago"}, 'Mon DD HH12:MI AM') as at from messages where lead_id = ${leadId} order by id`,
    sql`select * from approvals where lead_id = ${leadId} and status = 'pending' order by id desc`,
  ]);
  const hidden = <input type="hidden" name="id" value={leadId} />;
  const ai = aiEnabled();

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <Link href="/hq/leads" className="muted small">← Leads</Link>
        <div className="page-head" style={{ marginTop: 6, marginBottom: 0 }}>
          <div><h1>{l.name}</h1><p className="muted">{l.source}{l.vehicle ? ` · ${l.vehicle}` : ""}</p></div>
          <span className={`chip ${l.stage}`} style={{ fontSize: 14, padding: "6px 14px" }}>{leadStageLabel(l.stage)}</span>
        </div>
      </div>

      <div className="row wrap">
        {l.phone && <a className="btn ghost small" href={`tel:${l.phone}`}>Call</a>}
        {l.phone && <a className="btn ghost small" href={`sms:${l.phone}`}>Text</a>}
        {l.email && <a className="btn ghost small" href={`mailto:${l.email}`}>Email</a>}
        {l.job_id ? <Link className="btn small" href={`/hq/jobs/${l.job_id}`}>Open job</Link> : (
          <form action={convertLead}>{hidden}<button className="btn small">Turn into a job</button></form>
        )}
      </div>

      <form action={setLeadStage} className="status-row">
        {hidden}
        {LEAD_STAGES.map((s) => (
          <button key={s.key} name="stage" value={s.key} className={`btn ghost small${l.stage === s.key ? " current" : ""}`}>{s.label}</button>
        ))}
      </form>

      <div className="card stack" id="drafts">
        <div className="row between wrap"><h2>Write a message</h2><span className="chip info">{ai ? "AI connected" : "Templates (AI not connected)"}</span></div>
        <form action={draftFor} className="stack" style={{ gap: 10 }}>
          {hidden}
          <input name="hint" placeholder="Optional: tell me what to say (e.g. offer Thursday afternoon)" />
          <div className="row wrap">
            <button className="btn" name="kind" value="reply">Draft a reply</button>
            <button className="btn ghost" name="kind" value="follow_up">Draft a follow-up</button>
          </div>
        </form>
        {drafts.map((a: any) => <DraftCard key={a.id} a={a} showLead={false} />)}
      </div>

      <div className="card stack">
        <h2>Conversation</h2>
        {msgs.length === 0 && <p className="muted small">No messages logged yet. Paste what they sent, or log what you sent.</p>}
        <div className="thread">
          {msgs.map((m: any, i: number) => (
            <div key={i} className={`bubble ${m.direction}`}>{m.body}<div className="tiny" style={{ marginTop: 4 }}>{m.direction === "in" ? "Them" : "You"} · {m.at}</div></div>
          ))}
        </div>
        <form action={logMessage} className="stack" style={{ gap: 8 }}>
          {hidden}
          <textarea name="body" placeholder="Paste a message here…" required />
          <div className="row wrap">
            <button className="btn ghost small" name="direction" value="in">Log as from them</button>
            <button className="btn ghost small" name="direction" value="out">Log as sent by me</button>
          </div>
        </form>
      </div>

      <form action={updateLead} className="card stack">
        {hidden}
        <h2>Details</h2>
        <div className="fields three">
          <div className="field"><label>Name</label><input name="name" defaultValue={l.name} /></div>
          <div className="field"><label>Phone</label><input name="phone" defaultValue={l.phone} /></div>
          <div className="field"><label>Email</label><input name="email" defaultValue={l.email} /></div>
        </div>
        <div className="fields three">
          <div className="field"><label>Source</label><select name="source" defaultValue={l.source}>{[...new Set([l.source, ...LEAD_SOURCES])].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Vehicle</label><input name="vehicle" defaultValue={l.vehicle} /></div>
          <div className="field"><label>Follow up on</label><input name="follow_up" type="date" defaultValue={l.fu || ""} /></div>
        </div>
        <div className="field"><label>Notes</label><textarea name="notes" defaultValue={l.notes} /></div>
        <button className="btn">Save</button>
      </form>

      <form action={deleteLead} style={{ textAlign: "right" }}>{hidden}<button className="btn danger small">Delete lead</button></form>
    </div>
  );
}
