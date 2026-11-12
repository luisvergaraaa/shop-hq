"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql, rawQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { createJob } from "@/lib/jobs";
import { cents } from "@/lib/format";
import { STATUSES } from "@/lib/status";
import { SCHEMA } from "@/lib/schema";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) || "").trim().slice(0, max);
const id = (f: FormData, k = "id") => Number(f.get(k)) || 0;
const validWhen = (s: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : null);

function refresh(jobId?: number) {
  revalidatePath("/hq", "layout");
  if (jobId) revalidatePath(`/hq/jobs/${jobId}`);
}

/* ---------- requests & jobs ---------- */
export async function acceptRequest(f: FormData) {
  await requireAdmin();
  const j = id(f);
  await sql`update jobs set status = 'scheduled' where id = ${j}`;
  refresh(j);
}

export async function declineRequest(f: FormData) {
  await requireAdmin();
  const j = id(f);
  await sql`update jobs set status = 'declined' where id = ${j}`;
  refresh(j);
}

export async function setStatus(f: FormData) {
  await requireAdmin();
  const j = id(f);
  const status = str(f, "status");
  if (!STATUSES.some((s) => s.key === status)) return;
  if (status === "complete") await sql`update jobs set status = ${status}, completed_at = coalesce(completed_at, now()) where id = ${j}`;
  else await sql`update jobs set status = ${status} where id = ${j}`;
  refresh(j);
}

export async function updateJob(f: FormData) {
  await requireAdmin();
  const j = id(f);
  await sql`update jobs set
      scheduled_at = ${validWhen(str(f, "when"))},
      address = ${str(f, "address", 300)},
      concern = ${str(f, "concern")},
      findings = ${str(f, "findings", 6000)},
      notes = ${str(f, "notes", 6000)}
    where id = ${j}`;
  const mileage = str(f, "mileage", 12);
  await sql`update vehicles set mileage = ${mileage} where id = (select vehicle_id from jobs where id = ${j})`;
  refresh(j);
}

export async function addCode(f: FormData) {
  await requireAdmin();
  const j = id(f);
  const code = str(f, "code", 12).toUpperCase();
  if (!code) return;
  const sev = ["info", "warn", "critical"].includes(str(f, "severity")) ? str(f, "severity") : "warn";
  await sql`insert into codes (job_id, code, description, severity) values (${j}, ${code}, ${str(f, "description", 300)}, ${sev})`;
  refresh(j);
}

export async function deleteCode(f: FormData) {
  await requireAdmin();
  await sql`delete from codes where id = ${id(f, "code_id")}`;
  refresh(id(f));
}

export async function addLine(f: FormData) {
  await requireAdmin();
  const j = id(f);
  const label = str(f, "label", 200);
  if (!label) return;
  const qty = Math.max(0, parseFloat(str(f, "qty")) || 1);
  await sql`insert into line_items (job_id, label, qty, unit_cents) values (${j}, ${label}, ${qty}, ${cents(f.get("price"))})`;
  refresh(j);
}

export async function deleteLine(f: FormData) {
  await requireAdmin();
  await sql`delete from line_items where id = ${id(f, "line_id")}`;
  refresh(id(f));
}

export async function markPaid(f: FormData) {
  await requireAdmin();
  const j = id(f);
  const method = str(f, "method", 30) || "Card";
  await sql`update jobs set paid_at = now(), paid_method = ${method},
      paid_cents = (select coalesce(sum(qty*unit_cents),0)::int from line_items where job_id = ${j}),
      status = case when status in ('declined','requested') then status else 'complete' end,
      completed_at = coalesce(completed_at, now())
    where id = ${j}`;
  refresh(j);
}

export async function markUnpaid(f: FormData) {
  await requireAdmin();
  const j = id(f);
  await sql`update jobs set paid_at = null, paid_cents = 0, paid_method = '' where id = ${j}`;
  refresh(j);
}

export async function newJob(f: FormData) {
  await requireAdmin();
  const name = str(f, "name", 120);
  if (!name) redirect("/hq/jobs/new?e=1");
  const jobId = await createJob({
    name, phone: str(f, "phone", 40), email: str(f, "email", 160),
    year: str(f, "year", 4), make: str(f, "make", 40), model: str(f, "model", 60),
    vin: str(f, "vin", 17), mileage: str(f, "mileage", 12),
    serviceId: Number(f.get("service")) || null, when: validWhen(str(f, "when")),
    address: str(f, "address", 300), concern: str(f, "concern"), status: "scheduled",
  });
  refresh();
  redirect(`/hq/jobs/${jobId}`);
}

export async function deleteJob(f: FormData) {
  await requireAdmin();
  await sql`delete from jobs where id = ${id(f)}`;
  refresh();
  redirect("/hq/jobs");
}

/* ---------- customers ---------- */
export async function updateCustomer(f: FormData) {
  await requireAdmin();
  const c = id(f);
  await sql`update customers set name = ${str(f, "name", 120)}, phone = ${str(f, "phone", 40)}, email = ${str(f, "email", 160)}, notes = ${str(f, "notes")} where id = ${c}`;
  revalidatePath(`/hq/customers/${c}`);
}

/* ---------- tasks ---------- */
export async function addTask(f: FormData) {
  await requireAdmin();
  const title = str(f, "title", 200);
  if (!title) return;
  const due = str(f, "due", 10);
  await sql`insert into tasks (title, due_on) values (${title}, ${/^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null})`;
  refresh();
}
export async function toggleTask(f: FormData) {
  await requireAdmin();
  await sql`update tasks set done = not done where id = ${id(f)}`;
  refresh();
}
export async function deleteTask(f: FormData) {
  await requireAdmin();
  await sql`delete from tasks where id = ${id(f)}`;
  refresh();
}

/* ---------- expenses ---------- */
export async function addExpense(f: FormData) {
  await requireAdmin();
  const amount = cents(f.get("amount"));
  if (!amount) return;
  const day = str(f, "spent_on", 10);
  await sql`insert into expenses (spent_on, category, amount_cents, note)
    values (${/^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null}::date, ${str(f, "category", 60) || "Other"}, ${amount}, ${str(f, "note", 300)})`;
  revalidatePath("/hq/expenses");
  revalidatePath("/hq/report");
}
export async function deleteExpense(f: FormData) {
  await requireAdmin();
  await sql`delete from expenses where id = ${id(f)}`;
  revalidatePath("/hq/expenses");
}

/* ---------- services ---------- */
export async function saveService(f: FormData) {
  await requireAdmin();
  const s = id(f);
  const name = str(f, "name", 120);
  if (!name) return;
  const price = cents(f.get("price"));
  const dur = Math.max(5, Number(f.get("duration")) || 60);
  const desc = str(f, "description", 300);
  const active = f.get("active") === "on";
  if (s) await sql`update services set name = ${name}, price_cents = ${price}, duration_min = ${dur}, description = ${desc}, active = ${active} where id = ${s}`;
  else await sql`insert into services (name, price_cents, duration_min, description, sort) values (${name}, ${price}, ${dur}, ${desc}, (select coalesce(max(sort),0)+1 from services))`;
  revalidatePath("/hq/services");
  revalidatePath("/");
}

/* ---------- setup ---------- */
export async function initDatabase() {
  await requireAdmin();
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await rawQuery(stmt);
  const n = await sql`select count(*)::int as n from services`;
  if (n[0].n === 0) {
    const seed: [string, string, number, number][] = [
      ["Check engine light diagnostic", "Full scan, freeze-frame review, and pinpoint testing to find the real cause.", 9500, 60],
      ["No-start / electrical diagnostic", "Battery, starter, charging, and wiring tests on site.", 12500, 90],
      ["Pre-purchase inspection", "Full scan of every module plus a road test and visual inspection before you buy.", 14900, 90],
      ["Battery & charging system test", "Load test, alternator output, and parasitic draw check.", 4900, 30],
    ];
    let i = 0;
    for (const [name, desc, price, dur] of seed) await sql`insert into services (name, description, price_cents, duration_min, sort) values (${name}, ${desc}, ${price}, ${dur}, ${i++})`;
  }
  refresh();
  redirect("/hq/setup?done=1");
}
