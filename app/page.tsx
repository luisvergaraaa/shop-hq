import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SHOP } from "@/lib/config";
import { sql, hasDb } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getServices() {
  if (!hasDb()) return [];
  try {
    return await sql`select id, name, description, price_cents, duration_min from services where active order by sort, id`;
  } catch { return []; }
}

export default async function Home() {
  const services = await getServices();
  return (
    <div className="site">
      <div className="glow" />
      <header className="site-head">
        <div className="row"><Logo size={44} /><span className="wordmark">{SHOP.name}</span></div>
        <Link href="/book" className="pill">Book now</Link>
      </header>

      <section className="hero">
        <p className="eyebrow" style={{ color: "var(--teal)" }}><span className="dot" /> Booking now</p>
        <h1 style={{ marginTop: 14 }}>Check engine light? We come to you.</h1>
        <p>{SHOP.tagline} Dealer-level scan tools, clear answers, and a written report before you spend a dollar on repairs.</p>
        <div className="row wrap" style={{ marginTop: 26 }}>
          <Link href="/book" className="btn" style={{ padding: "16px 24px", fontSize: 17 }}>Book a diagnostic</Link>
          {SHOP.phone && <a href={`tel:${SHOP.phone.replace(/[^\d+]/g, "")}`} className="btn ghost" style={{ padding: "16px 24px", fontSize: 17 }}>Call {SHOP.phone}</a>}
        </div>
      </section>

      <section className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <p className="eyebrow">Services</p>
          <div style={{ marginTop: 8 }}>
            {services.length === 0 && <p className="muted" style={{ padding: "16px 0" }}>Services and pricing coming soon.</p>}
            {services.map((s: any) => (
              <div className="service" key={s.id}>
                <div>
                  <h3>{s.name}</h3>
                  {s.description && <p className="muted small" style={{ marginTop: 4 }}>{s.description}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontWeight: 800 }}>{money(s.price_cents)}</div>
                  <div className="muted small">~{s.duration_min} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card stack">
          <p className="eyebrow">How it works</p>
          {[
            ["Book online", "Pick a service, tell us about your vehicle and where it's parked."],
            ["We come to you", "Home, work, or roadside. You'll get a text when we're on the way."],
            ["Get a clear report", "Codes, findings, and a repair estimate you can approve from your phone."],
          ].map(([t, d], i) => (
            <div key={t} className="row" style={{ alignItems: "flex-start", gap: 14 }}>
              <span className="step-num" style={{ marginBottom: 0, flex: "none" }}>{i + 1}</span>
              <div><h3>{t}</h3><p className="muted small" style={{ marginTop: 2 }}>{d}</p></div>
            </div>
          ))}
          {SHOP.area && <p className="small" style={{ marginTop: 6, color: "var(--teal)" }}>{SHOP.area}</p>}
        </div>
      </section>

      <footer className="row between wrap muted small" style={{ padding: "30px 0 40px" }}>
        <span>© {new Date().getFullYear()} {SHOP.name}</span>
        <Link href="/login">Owner sign in</Link>
      </footer>
    </div>
  );
}
