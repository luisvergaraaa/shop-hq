import { sql } from "@/lib/db";
import { todayLocal } from "@/lib/format";
import type { Counts } from "./nav";

export async function getCounts(): Promise<{ counts: Counts; dbReady: boolean }> {
  try {
    const t = todayLocal();
    const r = await sql`select
      (select count(*) from jobs where scheduled_at::date = ${t}::date and status not in ('declined','requested'))::int as today,
      (select count(*) from jobs where status = 'requested')::int as requested,
      (select count(*) from tasks where not done)::int as tasks,
      (select count(*) from jobs where status = 'complete' and paid_at is null)::int as unpaid`;
    return { counts: r[0], dbReady: true };
  } catch {
    return { counts: { today: 0, requested: 0, tasks: 0, unpaid: 0 }, dbReady: false };
  }
}

/** Shared job-list select. Times come back as shop-local text "YYYY-MM-DDTHH:MI". */
export async function listJobs(where: "requested" | "open" | "all" | "today" | "range", a?: string, b?: string) {
  const rows = await sql`select j.id, j.status, j.address, j.concern, j.paid_at, j.token,
      to_char(j.scheduled_at, 'YYYY-MM-DD"T"HH24:MI') as at,
      c.id as customer_id, c.name, c.phone, v.year, v.make, v.model, s.name as service,
      (select coalesce(sum(qty*unit_cents),0)::int from line_items where job_id = j.id) as total
    from jobs j
    join customers c on c.id = j.customer_id
    left join vehicles v on v.id = j.vehicle_id
    left join services s on s.id = j.service_id
    where case
      when ${where}::text = 'requested' then j.status = 'requested'
      when ${where}::text = 'open' then j.status not in ('requested','complete','declined')
      when ${where}::text = 'today' then j.scheduled_at::date = ${a || null}::date and j.status not in ('declined','requested')
      when ${where}::text = 'range' then j.scheduled_at::date between ${a || null}::date and ${b || null}::date and j.status <> 'declined'
      else true end
    order by j.scheduled_at nulls last, j.id desc
    limit 300`;
  return rows;
}
