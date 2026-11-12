import Link from "next/link";
import { sql } from "@/lib/db";
import { money, fmtDate, vehicleName } from "@/lib/format";

export default async function Invoices({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "unpaid" } = await searchParams;
  const paid = view === "paid";
  let rows: any[] = [];
  try {
    rows = await sql`select j.id, j.paid_at, j.paid_method, j.paid_cents, j.completed_at, c.name, v.year, v.make, v.model,
        (select coalesce(sum(qty*unit_cents),0)::int from line_items where job_id = j.id) as total
      from jobs j join customers c on c.id = j.customer_id left join vehicles v on v.id = j.vehicle_id
      where case when ${paid}::boolean then j.paid_at is not null else j.status = 'complete' and j.paid_at is null end
      order by coalesce(j.paid_at, j.completed_at, j.created_at) desc limit 200`;
  } catch {}
  const sum = rows.reduce((t, r) => t + (paid ? r.paid_cents : r.total), 0);
  return (
    <div>
      <div className="page-head"><h1>Invoices</h1><span className="num" style={{ fontSize: 22, fontWeight: 800 }}>{money(sum)}</span></div>
      <div className="row" style={{ marginBottom: 14 }}>
        <Link href="/hq/invoices" className={`btn small ${paid ? "ghost" : ""}`}>Unpaid</Link>
        <Link href="/hq/invoices?view=paid" className={`btn small ${paid ? "" : "ghost"}`}>Paid</Link>
      </div>
      <div className="card list">
        {rows.length === 0 && <p className="empty">{paid ? "No payments recorded yet." : "Nothing outstanding. Completed jobs that aren't paid show up here."}</p>}
        {rows.map((r) => (
          <Link key={r.id} href={`/hq/jobs/${r.id}`} className="list-item">
            <div><h3>{r.name}</h3><p className="muted small">{vehicleName(r)} · #{r.id}{paid ? ` · ${r.paid_method} · ${fmtDate(r.paid_at?.toISOString?.() || r.paid_at)}` : ""}</p></div>
            <span className="num" style={{ fontWeight: 800 }}>{money(paid ? r.paid_cents : r.total)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
