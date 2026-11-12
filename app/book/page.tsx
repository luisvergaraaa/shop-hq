import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SHOP } from "@/lib/config";
import { sql, hasDb } from "@/lib/db";
import { money } from "@/lib/format";
import { submitBooking } from "./actions";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ e?: string; service?: string }> }) {
  const { e, service } = await searchParams;
  let services: any[] = [];
  if (hasDb()) { try { services = await sql`select id, name, price_cents from services where active order by sort, id`; } catch {} }

  return (
    <div className="site" style={{ maxWidth: 720 }}>
      <div className="glow" />
      <header className="site-head">
        <Link href="/" className="row"><Logo size={40} /><span className="wordmark">{SHOP.name}</span></Link>
      </header>
      <h1 style={{ marginTop: 10 }}>Book a visit</h1>
      <p className="muted" style={{ marginTop: 6 }}>Tell us what's going on. We'll confirm your time by text.</p>
      {e && <div className="notice" style={{ marginTop: 16 }}>Please add your name and phone number.</div>}

      <form action={submitBooking} className="stack" style={{ marginTop: 22, gap: 18, paddingBottom: 60 }}>
        <input type="text" name="company" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="card stack">
          <h2>Service</h2>
          <div className="field">
            <label htmlFor="service">What do you need?</label>
            <select id="service" name="service" defaultValue={service || ""}>
              <option value="">Not sure, help me figure it out</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.price_cents)})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="concern">What's happening with the vehicle?</label>
            <textarea id="concern" name="concern" placeholder="Check engine light came on, rough idle when cold, started last week…" />
          </div>
        </div>

        <div className="card stack">
          <h2>Vehicle</h2>
          <div className="fields three">
            <div className="field"><label htmlFor="year">Year</label><input id="year" name="year" inputMode="numeric" maxLength={4} placeholder="2017" /></div>
            <div className="field"><label htmlFor="make">Make</label><input id="make" name="make" placeholder="Honda" /></div>
            <div className="field"><label htmlFor="model">Model</label><input id="model" name="model" placeholder="Accord" /></div>
          </div>
          <div className="fields two">
            <div className="field"><label htmlFor="vin">VIN (optional)</label><input id="vin" name="vin" maxLength={17} style={{ textTransform: "uppercase" }} /></div>
            <div className="field"><label htmlFor="mileage">Mileage (optional)</label><input id="mileage" name="mileage" inputMode="numeric" /></div>
          </div>
        </div>

        <div className="card stack">
          <h2>When and where</h2>
          <div className="field"><label htmlFor="when">Preferred date and time</label><input id="when" name="when" type="datetime-local" /></div>
          <div className="field"><label htmlFor="address">Where is the vehicle?</label><input id="address" name="address" autoComplete="street-address" placeholder="Street address, city" /></div>
        </div>

        <div className="card stack">
          <h2>Your info</h2>
          <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" required /></div>
          <div className="fields two">
            <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" required /></div>
            <div className="field"><label htmlFor="email">Email (optional)</label><input id="email" name="email" type="email" autoComplete="email" /></div>
          </div>
        </div>

        <button className="btn block" type="submit" style={{ padding: 18, fontSize: 18 }}>Request my visit</button>
      </form>
    </div>
  );
}
