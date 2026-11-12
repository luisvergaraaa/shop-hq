import Link from "next/link";
import { sql } from "@/lib/db";
import { money } from "@/lib/format";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const like = `%${q.trim()}%`;
  let rows: any[] = [];
  try {
    rows = await sql`select c.id, c.name, c.phone,
        (select count(*) from jobs where customer_id = c.id and status <> 'declined')::int as jobs,
        (select coalesce(sum(paid_cents),0)::int from jobs where customer_id = c.id) as spent,
        (select string_agg(trim(year||' '||make||' '||model), ', ') from vehicles where customer_id = c.id) as vehicles
      from customers c
      where ${q.trim()}::text = '' or c.name ilike ${like} or c.phone ilike ${like}
        or exists (select 1 from vehicles v where v.customer_id = c.id and (v.make ilike ${like} or v.model ilike ${like} or v.vin ilike ${like}))
      order by c.created_at desc limit 200`;
  } catch {}
  return (
    <div>
      <div className="page-head"><h1>Customers</h1></div>
      <form className="row" style={{ marginBottom: 14 }}>
        <input name="q" defaultValue={q} placeholder="Search name, phone, vehicle or VIN" />
        <button className="btn ghost">Search</button>
      </form>
      <div className="card list">
        {rows.length === 0 && <p className="empty">No customers found.</p>}
        {rows.map((c) => (
          <Link key={c.id} href={`/hq/customers/${c.id}`} className="list-item">
            <div style={{ minWidth: 0 }}>
              <h3>{c.name}</h3>
              <p className="muted small">{c.phone}{c.vehicles ? ` · ${c.vehicles}` : ""}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="num" style={{ fontWeight: 800 }}>{money(c.spent)}</div>
              <div className="muted small">{c.jobs} job{c.jobs === 1 ? "" : "s"}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
