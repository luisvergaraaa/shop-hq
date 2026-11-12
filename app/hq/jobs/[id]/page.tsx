import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { money, vehicleName } from "@/lib/format";
import { STATUSES, statusLabel } from "@/lib/status";
import { setStatus, updateJob, addCode, deleteCode, addLine, deleteLine, markPaid, markUnpaid, deleteJob } from "../../actions";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!jobId) notFound();
  const rows = await sql`select j.*, to_char(j.scheduled_at, 'YYYY-MM-DD"T"HH24:MI') as at,
      c.name, c.phone, c.email, v.year, v.make, v.model, v.vin, v.mileage, s.name as service
    from jobs j join customers c on c.id = j.customer_id
    left join vehicles v on v.id = j.vehicle_id left join services s on s.id = j.service_id
    where j.id = ${jobId}`;
  if (!rows.length) notFound();
  const j = rows[0];
  const [codes, lines] = await Promise.all([
    sql`select * from codes where job_id = ${jobId} order by id`,
    sql`select id, label, qty::float as qty, unit_cents from line_items where job_id = ${jobId} order by id`,
  ]);
  const total = lines.reduce((t: number, l: any) => t + Math.round(l.qty * l.unit_cents), 0);
  const hidden = <input type="hidden" name="id" value={jobId} />;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <Link href="/hq/jobs" className="muted small">← Jobs</Link>
        <div className="page-head" style={{ marginTop: 6, marginBottom: 0 }}>
          <div>
            <h1>{vehicleName(j)}</h1>
            <p className="muted">{j.service || "General diagnostic"} · Job #{j.id}</p>
          </div>
          <span className={`chip ${j.paid_at ? "paid" : j.status}`} style={{ fontSize: 14, padding: "6px 14px" }}>{j.paid_at ? "Paid" : statusLabel(j.status)}</span>
        </div>
      </div>

      {j.estimate_response && (
        <div className="notice">Customer {j.estimate_response === "approved" ? "approved" : "declined"} the estimate from their report link.</div>
      )}

      <form action={setStatus} className="status-row">
        {hidden}
        {STATUSES.map((s) => (
          <button key={s.key} name="status" value={s.key} className={`btn ghost small${j.status === s.key ? " current" : ""}`}>{s.label}</button>
        ))}
      </form>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 8 }}>
          <p className="eyebrow">Customer</p>
          <h2>{j.name}</h2>
          <div className="row wrap">
            {j.phone && <a className="btn ghost small" href={`tel:${j.phone}`}>Call</a>}
            {j.phone && <a className="btn ghost small" href={`sms:${j.phone}`}>Text</a>}
            {j.address && <a className="btn ghost small" href={`https://maps.google.com/?q=${encodeURIComponent(j.address)}`} target="_blank">Directions</a>}
            <Link className="btn ghost small" href={`/hq/customers/${j.customer_id}`}>Profile</Link>
          </div>
          <p className="muted small">{j.phone}{j.email ? ` · ${j.email}` : ""}</p>
          {j.vin && <p className="small">VIN <span className="num">{j.vin}</span></p>}
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <p className="eyebrow">Customer report</p>
          <p className="small muted">Send this link so they can see codes, findings and the estimate, and approve it from their phone.</p>
          <Link href={`/r/${j.token}`} target="_blank" className="btn ghost">Open report</Link>
          <p className="small muted" style={{ wordBreak: "break-all" }}>/r/{j.token}</p>
        </div>
      </div>

      <div className="card stack">
        <h2>Trouble codes</h2>
        {codes.length === 0 && <p className="muted small">No codes logged yet.</p>}
        <div className="list">
          {codes.map((c: any) => (
            <div key={c.id} className="list-item">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <span className={`chip ${c.severity}`} style={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>{c.code}</span>
                <span>{c.description}</span>
              </div>
              <form action={deleteCode}>{hidden}<input type="hidden" name="code_id" value={c.id} /><button className="btn danger small">Remove</button></form>
            </div>
          ))}
        </div>
        <form action={addCode} className="fields three">
          {hidden}
          <input name="code" placeholder="P0301" maxLength={12} style={{ textTransform: "uppercase" }} required />
          <input name="description" placeholder="Cylinder 1 misfire" />
          <div className="row">
            <select name="severity" defaultValue="warn"><option value="critical">Urgent</option><option value="warn">Needs attention</option><option value="info">Info</option></select>
            <button className="btn">Add</button>
          </div>
        </form>
      </div>

      <div className="card stack">
        <div className="row between"><h2>Estimate & invoice</h2><span className="num" style={{ fontSize: 22, fontWeight: 800 }}>{money(total)}</span></div>
        {lines.length > 0 && (
          <table>
            <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Total</th><th /></tr></thead>
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.id}>
                  <td>{l.label}</td><td className="r num">{l.qty}</td><td className="r num">{money(l.unit_cents)}</td><td className="r num">{money(Math.round(l.qty * l.unit_cents))}</td>
                  <td className="r"><form action={deleteLine}>{hidden}<input type="hidden" name="line_id" value={l.id} /><button className="btn danger small" aria-label="Remove line">✕</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={addLine} className="row wrap">
          {hidden}
          <input name="label" placeholder="Ignition coil (part) or Labor" style={{ flex: "2 1 200px" }} required />
          <input name="qty" placeholder="Qty" defaultValue="1" inputMode="decimal" style={{ flex: "0 1 80px" }} />
          <input name="price" placeholder="$ each" inputMode="decimal" style={{ flex: "1 1 100px" }} />
          <button className="btn">Add</button>
        </form>
        <div className="row wrap" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          {j.paid_at ? (
            <>
              <span className="chip paid">Paid {money(j.paid_cents)} · {j.paid_method}</span>
              <form action={markUnpaid}>{hidden}<button className="btn ghost small">Undo payment</button></form>
            </>
          ) : (
            <form action={markPaid} className="row wrap">
              {hidden}
              <select name="method" defaultValue="Card" style={{ width: 150 }}><option>Card</option><option>Cash</option><option>Zelle</option><option>Cash App</option><option>Venmo</option><option>Check</option></select>
              <button className="btn">Mark paid {money(total)}</button>
            </form>
          )}
        </div>
      </div>

      <form action={updateJob} className="card stack">
        {hidden}
        <h2>Details & notes</h2>
        <div className="fields two">
          <div className="field"><label>Date and time</label><input name="when" type="datetime-local" defaultValue={j.at || ""} /></div>
          <div className="field"><label>Mileage</label><input name="mileage" defaultValue={j.mileage || ""} inputMode="numeric" /></div>
        </div>
        <div className="field"><label>Address</label><input name="address" defaultValue={j.address} /></div>
        <div className="field"><label>Customer's concern</label><textarea name="concern" defaultValue={j.concern} /></div>
        <div className="field"><label>Findings (shown to customer)</label><textarea name="findings" defaultValue={j.findings} placeholder="Coil on cylinder 1 failed swap test; misfire followed the coil. Plugs worn at 98k." /></div>
        <div className="field"><label>Private notes (only you see these)</label><textarea name="notes" defaultValue={j.notes} /></div>
        <button className="btn">Save</button>
      </form>

      <form action={deleteJob} style={{ textAlign: "right" }}>{hidden}<button className="btn danger small">Delete job</button></form>
    </div>
  );
}
