import { sql } from "./db";

function token() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export type NewJob = {
  name: string; phone: string; email?: string;
  year?: string; make?: string; model?: string; vin?: string; mileage?: string;
  serviceId?: number | null; when?: string | null; address?: string; concern?: string;
  status: "requested" | "scheduled";
  source?: string; // when set, the job also appears in the Leads pipeline
};

/** Finds or creates the customer, adds the vehicle, creates the job and its starting line item. */
export async function createJob(j: NewJob) {
  const phone = j.phone.trim();
  let customerId: number;
  const found = phone ? await sql`select id from customers where phone = ${phone} limit 1` : [];
  if (found.length) {
    customerId = found[0].id;
    if (j.email) await sql`update customers set email = ${j.email} where id = ${customerId} and email = ''`;
  } else {
    const c = await sql`insert into customers (name, phone, email) values (${j.name.trim()}, ${phone}, ${j.email || ""}) returning id`;
    customerId = c[0].id;
  }

  let vehicleId: number | null = null;
  if (j.year || j.make || j.model || j.vin) {
    const v = await sql`insert into vehicles (customer_id, year, make, model, vin, mileage)
      values (${customerId}, ${j.year || ""}, ${j.make || ""}, ${j.model || ""}, ${(j.vin || "").toUpperCase()}, ${j.mileage || ""}) returning id`;
    vehicleId = v[0].id;
  }

  const job = await sql`insert into jobs (customer_id, vehicle_id, service_id, status, scheduled_at, address, concern, token)
    values (${customerId}, ${vehicleId}, ${j.serviceId || null}, ${j.status}, ${j.when || null}, ${j.address || ""}, ${j.concern || ""}, ${token()})
    returning id`;
  const jobId = job[0].id;

  if (j.source) {
    const veh = [j.year, j.make, j.model].filter(Boolean).join(" ");
    await sql`insert into leads (name, phone, email, source, vehicle, notes, stage, customer_id, job_id)
      values (${j.name.trim()}, ${phone}, ${j.email || ""}, ${j.source}, ${veh}, ${j.concern || ""}, 'booked', ${customerId}, ${jobId})`;
  }

  if (j.serviceId) {
    const s = await sql`select name, price_cents from services where id = ${j.serviceId}`;
    if (s.length) await sql`insert into line_items (job_id, label, qty, unit_cents) values (${jobId}, ${s[0].name}, 1, ${s[0].price_cents})`;
  }
  return jobId as number;
}
