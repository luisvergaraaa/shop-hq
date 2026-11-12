"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { createJob } from "@/lib/jobs";
import { aiCall, aiEnabled, ASSISTANT_VOICE } from "@/lib/ai";
import { createDraft, snapshot, insightFacts, type DraftKind } from "@/lib/crm";
import { runAutomations, AUTOMATIONS } from "@/lib/automations";
import { LEAD_STAGES } from "@/lib/status";
import { searchBusinesses } from "@/lib/prospect";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) || "").trim().slice(0, max);
const num = (f: FormData, k = "id") => Number(f.get(k)) || 0;
const day = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

function refresh(leadId?: number) {
  revalidatePath("/hq", "layout");
  if (leadId) revalidatePath(`/hq/leads/${leadId}`);
}

/* ---------- leads ---------- */
export async function addLead(f: FormData) {
  await requireAdmin();
  const name = str(f, "name", 120);
  if (!name) redirect("/hq/leads/new?e=1");
  const r = await sql`insert into leads (name, phone, email, source, vehicle, notes, follow_up_on)
    values (${name}, ${str(f, "phone", 40)}, ${str(f, "email", 160)}, ${str(f, "source", 30) || "Other"}, ${str(f, "vehicle", 120)}, ${str(f, "notes")}, ${day(str(f, "follow_up", 10))}::date)
    returning id`;
  refresh();
  redirect(`/hq/leads/${r[0].id}`);
}

export async function updateLead(f: FormData) {
  await requireAdmin();
  const id = num(f);
  await sql`update leads set name = ${str(f, "name", 120)}, phone = ${str(f, "phone", 40)}, email = ${str(f, "email", 160)},
      source = ${str(f, "source", 30) || "Other"}, vehicle = ${str(f, "vehicle", 120)}, notes = ${str(f, "notes")},
      follow_up_on = ${day(str(f, "follow_up", 10))}::date where id = ${id}`;
  refresh(id);
}

export async function setLeadStage(f: FormData) {
  await requireAdmin();
  const id = num(f);
  const stage = str(f, "stage");
  if (!LEAD_STAGES.some((s) => s.key === stage)) return;
  await sql`update leads set stage = ${stage} where id = ${id}`;
  refresh(id);
}

export async function deleteLead(f: FormData) {
  await requireAdmin();
  await sql`delete from leads where id = ${num(f)}`;
  refresh();
  redirect("/hq/leads");
}

export async function convertLead(f: FormData) {
  await requireAdmin();
  const id = num(f);
  const rows = await sql`select * from leads where id = ${id}`;
  if (!rows.length) redirect("/hq/leads");
  const l = rows[0];
  if (l.job_id) redirect(`/hq/jobs/${l.job_id}`);
  const parts = String(l.vehicle || "").trim().split(/\s+/);
  const hasYear = /^\d{4}$/.test(parts[0] || "");
  const jobId = await createJob({
    name: l.name, phone: l.phone, email: l.email,
    year: hasYear ? parts[0] : "", make: (hasYear ? parts[1] : parts[0]) || "", model: parts.slice(hasYear ? 2 : 1).join(" "),
    concern: l.notes, status: "scheduled",
  });
  const j = await sql`select customer_id from jobs where id = ${jobId}`;
  await sql`update leads set job_id = ${jobId}, customer_id = ${j[0].customer_id}, stage = 'booked' where id = ${id}`;
  refresh(id);
  redirect(`/hq/jobs/${jobId}`);
}

/* ---------- messages / inbox ---------- */
export async function logMessage(f: FormData) {
  await requireAdmin();
  const id = num(f);
  const body = str(f, "body", 4000);
  if (!body) return;
  const dir = f.get("direction") === "out" ? "out" : "in";
  await sql`insert into messages (lead_id, direction, body) values (${id}, ${dir}, ${body})`;
  if (dir === "out") await sql`update leads set last_contact_at = now(), stage = case when stage = 'new' then 'contacted' else stage end where id = ${id}`;
  refresh(id);
}

export async function logIncoming(f: FormData) {
  await requireAdmin();
  const name = str(f, "name", 120) || "Unknown";
  const phone = str(f, "phone", 40);
  const body = str(f, "body", 4000);
  if (!body) redirect("/hq/inbox?e=1");
  let leadId: number;
  const found = phone ? await sql`select id from leads where phone = ${phone} and stage not in ('won','lost') order by id desc limit 1` : [];
  if (found.length) leadId = found[0].id;
  else {
    const r = await sql`insert into leads (name, phone, source) values (${name}, ${phone}, ${str(f, "source", 30) || "Text"}) returning id`;
    leadId = r[0].id;
  }
  await sql`insert into messages (lead_id, direction, body) values (${leadId}, 'in', ${body})`;
  await createDraft(leadId, "reply", "", "Reply to their message");
  refresh(leadId);
  redirect(`/hq/leads/${leadId}`);
}

export async function draftFor(f: FormData) {
  await requireAdmin();
  const id = num(f);
  const kind: DraftKind = f.get("kind") === "follow_up" ? "follow_up" : "reply";
  await createDraft(id, kind, str(f, "hint", 300), kind === "follow_up" ? "Follow-up you asked for" : "Reply you asked for");
  refresh(id);
  redirect(`/hq/leads/${id}#drafts`);
}

/* ---------- approvals ---------- */
export async function saveDraft(f: FormData) {
  await requireAdmin();
  await sql`update approvals set body = ${str(f, "body", 1000)} where id = ${num(f)} and status = 'pending'`;
  refresh();
}

export async function markSent(f: FormData) {
  await requireAdmin();
  const id = num(f);
  const rows = await sql`update approvals set status = 'sent', sent_at = now() where id = ${id} and status = 'pending' returning lead_id, body`;
  if (rows.length && rows[0].lead_id) {
    const leadId = rows[0].lead_id;
    await sql`insert into messages (lead_id, direction, body) values (${leadId}, 'out', ${rows[0].body})`;
    await sql`update leads set last_contact_at = now(), stage = case when stage = 'new' then 'contacted' else stage end where id = ${leadId}`;
    revalidatePath(`/hq/leads/${leadId}`);
  }
  refresh();
}

export async function dismissDraft(f: FormData) {
  await requireAdmin();
  await sql`update approvals set status = 'dismissed' where id = ${num(f)} and status = 'pending'`;
  refresh();
}

/* ---------- automations ---------- */
export async function toggleAutomation(f: FormData) {
  await requireAdmin();
  const key = str(f, "key", 40);
  if (!AUTOMATIONS.some((a) => a.key === key)) return;
  const enabled = f.get("enabled") === "on";
  await sql`insert into automations (key, enabled) values (${key}, ${enabled}) on conflict (key) do update set enabled = ${enabled}`;
  revalidatePath("/hq/automations");
}

export async function runAutomationsNow() {
  await requireAdmin();
  const made = await runAutomations();
  refresh();
  redirect(`/hq/approvals?made=${made}`);
}

/* ---------- AI assistant & insights ---------- */
export async function askAssistant(f: FormData) {
  await requireAdmin();
  const q = str(f, "q", 600);
  if (!q) redirect("/hq/assistant");
  if (!aiEnabled()) redirect("/hq/assistant?e=noai");
  const data = await snapshot();
  const ai = await aiCall(ASSISTANT_VOICE, `BUSINESS DATA\n${data}\n\nQUESTION\n${q}`, 700);
  if (!ai.text) redirect("/hq/assistant?e=fail");
  await sql`insert into ai_log (kind, question, answer) values ('chat', ${q}, ${ai.text})`;
  revalidatePath("/hq/assistant");
  redirect("/hq/assistant");
}

export async function generateInsights() {
  await requireAdmin();
  if (!aiEnabled()) redirect("/hq/insights?e=noai");
  const data = (await snapshot()) + "\n\n" + (await insightFacts());
  const ai = await aiCall(
    ASSISTANT_VOICE,
    `BUSINESS DATA\n${data}\n\nWrite this week's insights for the owner: 3 to 5 short observations about what is working or slipping (leads, bookings, money, follow-ups), then 3 specific actions to take this week, most valuable first. Plain text with dashes.`,
    800,
  );
  if (!ai.text) redirect("/hq/insights?e=fail");
  await sql`insert into ai_log (kind, question, answer) values ('insight', 'Weekly insights', ${ai.text})`;
  revalidatePath("/hq/insights");
  redirect("/hq/insights");
}

/* ---------- import ---------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export async function importLeads(f: FormData) {
  await requireAdmin();
  const rows = parseCsv(str(f, "csv", 200000));
  if (rows.length < 2) redirect("/hq/import?e=1");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const ix = { name: col(["name", "full name", "customer"]), phone: col(["phone", "mobile", "cell"]), email: col(["email", "e-mail"]), vehicle: col(["vehicle", "car"]), notes: col(["notes", "note"]), source: col(["source"]) };
  if (ix.name < 0) redirect("/hq/import?e=1");
  let added = 0, skipped = 0;
  for (const r of rows.slice(1, 501)) {
    const get = (i: number) => (i >= 0 ? (r[i] || "").trim() : "");
    const name = get(ix.name);
    if (!name) { skipped++; continue; }
    const phone = get(ix.phone);
    if (phone) {
      const dup = await sql`select 1 from leads where phone = ${phone} limit 1`;
      if (dup.length) { skipped++; continue; }
    }
    await sql`insert into leads (name, phone, email, vehicle, notes, source) values (${name.slice(0, 120)}, ${phone.slice(0, 40)}, ${get(ix.email).slice(0, 160)}, ${get(ix.vehicle).slice(0, 120)}, ${get(ix.notes).slice(0, 2000)}, ${get(ix.source).slice(0, 30) || "Import"})`;
    added++;
  }
  refresh();
  redirect(`/hq/import?added=${added}&skipped=${skipped}`);
}

/* ---------- prospecting (local businesses) ---------- */
export async function findProspects(f: FormData) {
  await requireAdmin();
  const category = str(f, "category", 30), city = str(f, "city", 40);
  const r = await searchBusinesses(category, city);
  if (r.error) redirect(`/hq/prospect?e=${r.error}`);
  let added = 0, skipped = 0;
  for (const b of r.list) {
    const digits = b.phone.replace(/\D/g, "");
    const dup = await sql`select 1 from leads where regexp_replace(phone, '\\D', '', 'g') = ${digits} limit 1`;
    if (dup.length) { skipped++; continue; }
    const notes = [b.type, b.address, b.website].filter(Boolean).join(" · ");
    await sql`insert into leads (name, phone, notes, source, stage) values (${b.name}, ${b.phone}, ${notes}, 'Prospecting', 'new')`;
    added++;
  }
  refresh();
  redirect(`/hq/prospect?added=${added}&skipped=${skipped}&c=${encodeURIComponent(city)}`);
}
