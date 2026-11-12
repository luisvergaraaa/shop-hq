import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SHOP } from "@/lib/config";
import { sql } from "@/lib/db";
import { fmtWhen, money, vehicleName } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { respondEstimate } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const SEV: Record<string, string> = { critical: "Urgent", warn: "Needs attention", info: "Info" };

export default async function CustomerReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{10,40}$/.test(token)) notFound();
  const rows = await sql`select j.id, j.status, j.findings, j.concern, j.paid_at, j.paid_cents, j.estimate_response,
      to_char(j.scheduled_at, 'YYYY-MM-DD"T"HH24:MI') as at, c.name, v.year, v.make, v.model, v.vin, v.mileage
    from jobs j join customers c on c.id = j.customer_id left join vehicles v on v.id = j.vehicle_id where j.token = ${token}`;
  if (!rows.length) notFound();
  const j = rows[0];
  const [codes, lines] = await Promise.all([
    sql`select code, description, severity from codes where job_id = ${j.id} order by case severity when 'critical' then 0 when 'warn' then 1 else 2 end, id`,
    sql`select label, qty::float as qty, unit_cents from line_items where job_id = ${j.id} order by id`,
  ]);
  const total = lines.reduce((t: number, l: any) => t + Math.round(l.qty * l.unit_cents), 0);

  return (
    <div className="site" style={{ maxWidth: 680, paddingBottom: 60 }}>
      <div className="glow" />
      <header className="site-head">
        <div className="row"><Logo size={40} /><span className="wordmark">{SHOP.name}</span></div>
        <span className={`chip ${j.paid_at ? "paid" : j.status}`}>{j.paid_at ? "Paid" : statusLabel(j.status)}</span>
      </header>
      <p className="eyebrow">Vehicle report · #{j.id}</p>
      <h1 style={{ marginTop: 8 }}>{vehicleName(j)}</h1>
      <p className="muted" style={{ marginTop: 4 }}>Prepared for {j.name} · {fmtWhen(j.at, { date: true, time: false })}{j.mileage ? ` · ${j.mileage} mi` : ""}</p>

      <div className="stack" style={{ marginTop: 22, gap: 14 }}>
        {codes.length > 0 && (
          <div className="card stack">
            <h2>What we found</h2>
            {codes.map((c: any, i: number) => (
              <div key={i} className="row" style={{ alignItems: "flex-start" }}>
                <span className={`chip ${c.severity}`} style={{ fontFamily: "ui-monospace, monospace" }}>{c.code}</span>
                <div><p>{c.description}</p><p className="muted small">{SEV[c.severity] || ""}</p></div>
              </div>
            ))}
          </div>
        )}
        {j.findings && (
          <div className="card stack" style={{ gap: 8 }}>
            <h2>Technician notes</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{j.findings}</p>
          </div>
        )}
        {lines.length > 0 && (
          <div className="card stack">
            <h2>{j.paid_at ? "Invoice" : "Estimate"}</h2>
            <table><tbody>
              {lines.map((l: any, i: number) => (
                <tr key={i}><td>{l.label}{l.qty !== 1 ? <span className="muted"> × {l.qty}</span> : null}</td><td className="r num">{money(Math.round(l.qty * l.unit_cents))}</td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td className="r num"><strong>{money(total)}</strong></td></tr>
            </tbody></table>
            {j.paid_at && <p className="small" style={{ color: "var(--ok)" }}>Paid in full. Thank you!</p>}
          </div>
        )}
        {j.status === "awaiting_approval" && !j.estimate_response && (
          <form action={respondEstimate} className="card stack">
            <input type="hidden" name="token" value={token} />
            <h2>Approve this estimate?</h2>
            <p className="muted small">Approving lets us start the repair. Questions first? Call or text {SHOP.phone || "us"}.</p>
            <div className="row wrap">
              <button className="btn" name="answer" value="approved">Approve {money(total)}</button>
              <button className="btn ghost" name="answer" value="declined">Not right now</button>
            </div>
          </form>
        )}
        {j.estimate_response && !j.paid_at && (
          <div className="notice">{j.estimate_response === "approved" ? "Thanks, you approved this estimate. We're on it." : "Got it. You declined this estimate for now."}</div>
        )}
        {SHOP.phone && <p className="muted small" style={{ textAlign: "center", marginTop: 10 }}>Questions? Call or text {SHOP.phone}</p>}
      </div>
    </div>
  );
}
