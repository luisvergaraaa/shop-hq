import Link from "next/link";
import { saveDraft, markSent, dismissDraft } from "@/app/hq/crm-actions";

const KIND: Record<string, string> = { reply: "Reply", first_touch: "First reply", follow_up: "Follow-up", review_request: "Review request" };

export function DraftCard({ a, showLead = true }: { a: any; showLead?: boolean }) {
  const smsHref = a.to_phone ? `sms:${String(a.to_phone).replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(a.body)}` : "";
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="row between wrap">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <h3>{a.to_name || "Customer"}</h3>
            <span className="chip requested">{KIND[a.kind] || a.kind}</span>
            {a.by_ai && <span className="chip info">AI draft</span>}
          </div>
          <p className="tiny" style={{ marginTop: 2 }}>{a.reason}{a.to_phone ? ` · ${a.to_phone}` : " · no phone number"}</p>
        </div>
        {showLead && a.lead_id && <Link href={`/hq/leads/${a.lead_id}`} className="btn ghost small">Open lead</Link>}
      </div>
      <form action={saveDraft} className="stack" style={{ gap: 8 }}>
        <input type="hidden" name="id" value={a.id} />
        <textarea name="body" defaultValue={a.body} style={{ minHeight: 110 }} />
        <div className="row wrap">
          <button className="btn ghost small">Save edits</button>
          {smsHref && <a className="btn small" href={smsHref}>Open in Messages</a>}
        </div>
      </form>
      <div className="row wrap" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <form action={markSent}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">I sent it</button></form>
        <form action={dismissDraft}><input type="hidden" name="id" value={a.id} /><button className="btn danger small">Dismiss</button></form>
        <span className="tiny">Open in Messages, send it, then tap "I sent it" to log it.</span>
      </div>
    </div>
  );
}
