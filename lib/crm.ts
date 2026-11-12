import { sql } from "./db";
import { SHOP } from "./config";
import { aiCall, SHOP_VOICE } from "./ai";
import { money, todayLocal, vehicleName } from "./format";

export type DraftKind = "reply" | "first_touch" | "follow_up" | "review_request";

const firstName = (n: string) => (n || "there").trim().split(/\s+/)[0];

function template(kind: DraftKind, name: string, vehicle: string): string {
  const f = firstName(name);
  if (kind === "follow_up")
    return `Hi ${f}, just checking in${vehicle ? ` on your ${vehicle}` : ""}. Happy to answer any questions or get you on the schedule. - ${SHOP.name}`;
  if (kind === "review_request") {
    const link = process.env.REVIEW_LINK;
    return `Hi ${f}, thanks for choosing ${SHOP.name}! If I earned it, a quick review helps a small shop a lot${link ? `: ${link}` : "."}`;
  }
  return `Hi ${f}, this is ${SHOP.name}. Thanks for reaching out${vehicle ? ` about your ${vehicle}` : ""}. I come to you with the scan tools. What day works for you, and what's the address?`;
}

async function servicesText() {
  const s = await sql`select name, price_cents, duration_min from services where active order by sort, id`;
  return s.map((x: any) => `- ${x.name}: ${money(x.price_cents)} (about ${x.duration_min} min)`).join("\n") || "(no services listed)";
}

/** Writes a draft text for a lead (AI if connected, otherwise a template) and queues it for approval. */
export async function createDraft(leadId: number, kind: DraftKind, hint = "", reason = ""): Promise<number | null> {
  const rows = await sql`select * from leads where id = ${leadId}`;
  if (!rows.length) return null;
  const lead = rows[0];
  const msgs = await sql`select direction, body from messages where lead_id = ${leadId} order by id desc limit 12`;
  const thread = msgs.reverse().map((m: any) => `${m.direction === "in" ? "Customer" : "Me"}: ${m.body}`).join("\n") || "(no messages yet)";
  const task =
    kind === "follow_up"
      ? "Write a short follow-up text. They have not replied lately. Be helpful, not pushy, and offer one clear next step."
      : "Write the text I should send next. If the customer wrote last, answer what they asked using only the facts above. If there are no messages, write a friendly first-touch text. Offer to schedule, and ask for the address or vehicle only if missing.";
  const prompt = `Customer: ${lead.name}
Phone: ${lead.phone || "unknown"}
Source: ${lead.source}
Vehicle: ${lead.vehicle || "unknown"}
Stage: ${lead.stage}
Notes: ${lead.notes || "none"}

My services:
${await servicesText()}

Conversation so far:
${thread}

Task: ${task}${hint ? `\nMy note to you: ${hint}` : ""}`;
  const ai = await aiCall(SHOP_VOICE, prompt, 400);
  const body = ai.text || template(kind, lead.name, lead.vehicle);
  const r = await sql`insert into approvals (kind, lead_id, to_name, to_phone, body, reason, by_ai)
    values (${kind}, ${leadId}, ${lead.name}, ${lead.phone}, ${body}, ${reason || (kind === "follow_up" ? "Follow-up" : "Reply")}, ${Boolean(ai.text)})
    returning id`;
  return r[0].id;
}

/** Queues a review-request text for a finished job. */
export async function createReviewDraft(jobId: number): Promise<number | null> {
  const rows = await sql`select j.id, c.name, c.phone, v.year, v.make, v.model
    from jobs j join customers c on c.id = j.customer_id left join vehicles v on v.id = j.vehicle_id where j.id = ${jobId}`;
  if (!rows.length) return null;
  const j = rows[0];
  const veh = vehicleName(j) === "Vehicle not listed" ? "" : vehicleName(j);
  const link = process.env.REVIEW_LINK;
  const ai = await aiCall(
    SHOP_VOICE,
    `Customer: ${j.name}\nVehicle: ${veh || "unknown"}\nTask: Write a short text thanking them for choosing ${SHOP.name} and asking for a quick review.${link ? ` Include this link exactly: ${link}` : " Do not include any link."}`,
    300,
  );
  const body = ai.text || template("review_request", j.name, veh);
  const r = await sql`insert into approvals (kind, job_id, to_name, to_phone, body, reason, by_ai)
    values ('review_request', ${jobId}, ${j.name}, ${j.phone}, ${body}, 'Ask for a review', ${Boolean(ai.text)}) returning id`;
  return r[0].id;
}

/** A plain-text picture of the business, used to give the AI real data. */
export async function snapshot(): Promise<string> {
  const today = todayLocal();
  const [jobs, leads, unpaid, week, pending] = await Promise.all([
    sql`select c.name, v.year, v.make, v.model, j.status, to_char(j.scheduled_at, 'Dy Mon DD HH12:MIAM') as at
      from jobs j join customers c on c.id = j.customer_id left join vehicles v on v.id = j.vehicle_id
      where j.scheduled_at >= ${today}::date and j.scheduled_at < (${today}::date + 7) and j.status <> 'declined'
      order by j.scheduled_at limit 15`,
    sql`select name, stage, source, vehicle, to_char(coalesce(last_contact_at, created_at), 'Mon DD') as last, to_char(follow_up_on, 'Mon DD') as fu
      from leads where stage in ('new','contacted','quoted') order by created_at desc limit 20`,
    sql`select c.name, (select coalesce(sum(qty*unit_cents),0)::int from line_items where job_id = j.id) as total
      from jobs j join customers c on c.id = j.customer_id where j.status = 'complete' and j.paid_at is null limit 15`,
    sql`select
      (select coalesce(sum(paid_cents),0)::int from jobs where paid_at >= now() - interval '7 days') as rev,
      (select coalesce(sum(amount_cents),0)::int from expenses where spent_on >= current_date - 7) as exp,
      (select count(*)::int from jobs where paid_at >= now() - interval '7 days') as jobs,
      (select count(*)::int from jobs where status = 'requested') as requested`,
    sql`select count(*)::int as n from approvals where status = 'pending'`,
  ]);
  const w = week[0];
  const lines: string[] = [];
  lines.push(`Today is ${today}. Business: ${SHOP.name}.`);
  lines.push(`Last 7 days: revenue ${money(w.rev)}, expenses ${money(w.exp)}, ${w.jobs} paid jobs. Booking requests waiting: ${w.requested}. Drafts waiting for my approval: ${pending[0].n}.`);
  lines.push(`Upcoming jobs (next 7 days):\n${jobs.map((j: any) => `- ${j.at}: ${j.name}, ${vehicleName(j)} (${j.status})`).join("\n") || "- none"}`);
  lines.push(`Open leads:\n${leads.map((l: any) => `- ${l.name} [${l.stage}] via ${l.source}${l.vehicle ? `, ${l.vehicle}` : ""}, last contact ${l.last}${l.fu ? `, follow up ${l.fu}` : ""}`).join("\n") || "- none"}`);
  lines.push(`Unpaid completed jobs:\n${unpaid.map((u: any) => `- ${u.name}: ${money(u.total)}`).join("\n") || "- none"}`);
  lines.push(`My services:\n${await servicesText()}`);
  return lines.join("\n\n");
}

/** Extra numbers for the weekly insights write-up. */
export async function insightFacts(): Promise<string> {
  const [funnel, sources, top] = await Promise.all([
    sql`select stage, count(*)::int as n from leads where created_at >= now() - interval '30 days' group by stage`,
    sql`select source, count(*)::int as total, count(*) filter (where stage = 'won')::int as won from leads where created_at >= now() - interval '30 days' group by source order by total desc`,
    sql`select coalesce(s.name, 'Other') as name, count(*)::int as n, coalesce(sum(j.paid_cents),0)::int as rev
      from jobs j left join services s on s.id = j.service_id where j.paid_at >= now() - interval '30 days' group by 1 order by rev desc limit 5`,
  ]);
  return [
    `Leads created in the last 30 days by stage: ${funnel.map((f: any) => `${f.stage} ${f.n}`).join(", ") || "none"}`,
    `Lead sources (last 30 days): ${sources.map((s: any) => `${s.source} ${s.total} (won ${s.won})`).join(", ") || "none"}`,
    `Paid work by service (last 30 days): ${top.map((t: any) => `${t.name} x${t.n} = ${money(t.rev)}`).join(", ") || "none"}`,
  ].join("\n");
}
