import { sql } from "@/lib/db";
import { money } from "@/lib/format";
import { newJob } from "../../actions";

export default async function NewJob({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  let services: any[] = [];
  try { services = await sql`select id, name, price_cents from services where active order by sort, id`; } catch {}
  return (
    <div>
      <div className="page-head"><div><h1>New job</h1><p className="muted">For phone calls and walk-ups. Returning customers are matched by phone number.</p></div></div>
      {e && <div className="notice">Add the customer's name.</div>}
      <form action={newJob} className="stack" style={{ gap: 16 }}>
        <div className="card stack">
          <h2>Customer</h2>
          <div className="fields three">
            <div className="field"><label>Name</label><input name="name" required /></div>
            <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
            <div className="field"><label>Email</label><input name="email" type="email" /></div>
          </div>
        </div>
        <div className="card stack">
          <h2>Vehicle</h2>
          <div className="fields three">
            <div className="field"><label>Year</label><input name="year" inputMode="numeric" maxLength={4} /></div>
            <div className="field"><label>Make</label><input name="make" /></div>
            <div className="field"><label>Model</label><input name="model" /></div>
          </div>
          <div className="fields two">
            <div className="field"><label>VIN</label><input name="vin" maxLength={17} style={{ textTransform: "uppercase" }} /></div>
            <div className="field"><label>Mileage</label><input name="mileage" inputMode="numeric" /></div>
          </div>
        </div>
        <div className="card stack">
          <h2>Job</h2>
          <div className="fields two">
            <div className="field"><label>Service</label>
              <select name="service" defaultValue=""><option value="">None yet</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.price_cents)})</option>)}</select>
            </div>
            <div className="field"><label>Date and time</label><input name="when" type="datetime-local" /></div>
          </div>
          <div className="field"><label>Address</label><input name="address" /></div>
          <div className="field"><label>Customer's concern</label><textarea name="concern" /></div>
        </div>
        <button className="btn block" style={{ padding: 16 }}>Create job</button>
      </form>
    </div>
  );
}
