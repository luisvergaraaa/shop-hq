import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { vehicleName } from "@/lib/format";
import { JobRow } from "@/components/JobRow";
import { updateCustomer } from "../../actions";

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = Number(id);
  const rows = cid ? await sql`select * from customers where id = ${cid}` : [];
  if (!rows.length) notFound();
  const c = rows[0];
  const [vehicles, jobs] = await Promise.all([
    sql`select * from vehicles where customer_id = ${cid} order by id desc`,
    sql`select j.id, j.status, j.address, j.paid_at, to_char(j.scheduled_at, 'YYYY-MM-DD"T"HH24:MI') as at,
        ${c.name}::text as name, v.year, v.make, v.model, s.name as service,
        (select coalesce(sum(qty*unit_cents),0)::int from line_items where job_id = j.id) as total
      from jobs j left join vehicles v on v.id = j.vehicle_id left join services s on s.id = j.service_id
      where j.customer_id = ${cid} order by j.scheduled_at desc nulls last, j.id desc`,
  ]);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link href="/hq/customers" className="muted small">← Customers</Link>
      <h1>{c.name}</h1>
      <div className="row wrap">
        {c.phone && <a className="btn ghost small" href={`tel:${c.phone}`}>Call</a>}
        {c.phone && <a className="btn ghost small" href={`sms:${c.phone}`}>Text</a>}
        {c.email && <a className="btn ghost small" href={`mailto:${c.email}`}>Email</a>}
      </div>
      <div className="card">
        <h2>Vehicles</h2>
        <div className="list" style={{ marginTop: 6 }}>
          {vehicles.length === 0 && <p className="empty">No vehicles on file.</p>}
          {vehicles.map((v: any) => (
            <div key={v.id} className="list-item"><strong>{vehicleName(v)}</strong><span className="muted small num">{v.vin || "No VIN"}{v.mileage ? ` · ${v.mileage} mi` : ""}</span></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>Job history</h2>
        <div className="list" style={{ marginTop: 6 }}>{jobs.length === 0 ? <p className="empty">No jobs yet.</p> : jobs.map((j: any) => <JobRow key={j.id} j={j} />)}</div>
      </div>
      <form action={updateCustomer} className="card stack">
        <input type="hidden" name="id" value={cid} />
        <h2>Contact info</h2>
        <div className="fields three">
          <div className="field"><label>Name</label><input name="name" defaultValue={c.name} /></div>
          <div className="field"><label>Phone</label><input name="phone" defaultValue={c.phone} /></div>
          <div className="field"><label>Email</label><input name="email" defaultValue={c.email} /></div>
        </div>
        <div className="field"><label>Notes</label><textarea name="notes" defaultValue={c.notes} placeholder="Gate code, prefers texts, fleet account…" /></div>
        <button className="btn">Save</button>
      </form>
    </div>
  );
}
