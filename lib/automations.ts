import { sql } from "./db";
import { createDraft, createReviewDraft } from "./crm";
import { todayLocal } from "./format";

export const AUTOMATIONS = [
  { key: "new_leads", title: "Reply to new leads", desc: "Drafts a first reply for leads you haven't contacted yet." },
  { key: "due_followups", title: "Follow-ups that are due", desc: "Drafts a text when a lead's follow-up date arrives." },
  { key: "quote_followups", title: "Nudge unanswered quotes", desc: "Drafts a check-in 2 days after you quoted and heard nothing." },
  { key: "review_requests", title: "Ask for reviews", desc: "Drafts a review request the day after a paid job." },
];

export async function enabledMap(): Promise<Record<string, boolean>> {
  const rows = await sql`select key, enabled from automations`;
  const m: Record<string, boolean> = {};
  for (const a of AUTOMATIONS) m[a.key] = true;
  for (const r of rows) m[r.key] = r.enabled;
  return m;
}

/** Looks for work that needs a nudge and queues drafts for approval. Nothing is sent. */
export async function runAutomations(): Promise<number> {
  const en = await enabledMap();
  const today = todayLocal();
  const LIMIT = 8;
  let made = 0;

  if (en.new_leads) {
    const rows = await sql`select l.id from leads l
      where l.stage = 'new' and l.source <> 'Prospecting' and l.phone <> '' and l.created_at < now() - interval '1 hour'
        and not exists (select 1 from approvals a where a.lead_id = l.id)
        and not exists (select 1 from messages m where m.lead_id = l.id and m.direction = 'out')
      order by l.created_at limit ${LIMIT}`;
    for (const r of rows) if (await createDraft(r.id, "first_touch", "", "New lead, no reply yet")) made++;
  }

  if (en.due_followups) {
    const rows = await sql`select l.id from leads l
      where l.follow_up_on is not null and l.follow_up_on <= ${today}::date and l.stage in ('new','contacted','quoted')
        and not exists (select 1 from approvals a where a.lead_id = l.id and a.status = 'pending')
      order by l.follow_up_on limit ${LIMIT}`;
    for (const r of rows) {
      if (await createDraft(r.id, "follow_up", "", "Follow-up date reached")) made++;
      await sql`update leads set follow_up_on = null where id = ${r.id}`;
    }
  }

  if (en.quote_followups) {
    const rows = await sql`select l.id from leads l
      where l.stage = 'quoted' and coalesce(l.last_contact_at, l.created_at) < now() - interval '2 days'
        and not exists (select 1 from approvals a where a.lead_id = l.id and a.created_at > now() - interval '3 days')
      order by l.created_at limit ${LIMIT}`;
    for (const r of rows) if (await createDraft(r.id, "follow_up", "", "No reply 2 days after quote")) made++;
  }

  if (en.review_requests) {
    const rows = await sql`select j.id from jobs j join customers c on c.id = j.customer_id
      where j.paid_at is not null and j.paid_at < now() - interval '1 day' and j.paid_at > now() - interval '21 days' and c.phone <> ''
        and not exists (select 1 from approvals a where a.job_id = j.id and a.kind = 'review_request')
      order by j.paid_at limit ${LIMIT}`;
    for (const r of rows) if (await createReviewDraft(r.id)) made++;
  }
  return made;
}
