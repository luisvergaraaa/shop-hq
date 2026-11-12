import { sql } from "@/lib/db";
import { saveService } from "../actions";

function ServiceForm({ s }: { s?: any }) {
  return (
    <form action={saveService} className="card stack">
      <input type="hidden" name="id" value={s?.id || ""} />
      <div className="fields three">
        <div className="field"><label>Name</label><input name="name" defaultValue={s?.name} required /></div>
        <div className="field"><label>Price</label><input name="price" inputMode="decimal" defaultValue={s ? (s.price_cents / 100).toFixed(2) : ""} placeholder="$0.00" /></div>
        <div className="field"><label>Minutes</label><input name="duration" inputMode="numeric" defaultValue={s?.duration_min || 60} /></div>
      </div>
      <div className="field"><label>Description (shown on your website)</label><input name="description" defaultValue={s?.description} /></div>
      <div className="row between">
        {s ? <label className="row" style={{ margin: 0, gap: 8 }}><input type="checkbox" name="active" defaultChecked={s.active} style={{ width: 20, height: 20 }} /> Show on website</label> : <span />}
        <button className="btn">{s ? "Save" : "Add service"}</button>
      </div>
    </form>
  );
}

export default async function Services() {
  let rows: any[] = [];
  try { rows = await sql`select * from services order by sort, id`; } catch {}
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Services & pricing</h1><p className="muted">These appear on your website and booking form.</p></div></div>
      {rows.map((s) => <ServiceForm key={s.id} s={s} />)}
      <h2 style={{ marginTop: 10 }}>Add a service</h2>
      <ServiceForm />
    </div>
  );
}
