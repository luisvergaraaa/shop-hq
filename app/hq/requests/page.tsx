import Link from "next/link";
import { fmtWhen, money, vehicleName } from "@/lib/format";
import { acceptRequest, declineRequest } from "../actions";
import { listJobs } from "../data";

export default async function Requests() {
  let rows: any[] = [];
  try { rows = await listJobs("requested"); } catch {}
  return (
    <div>
      <div className="page-head"><div><h1>Requests</h1><p className="muted">New bookings from your website.</p></div></div>
      {rows.length === 0 && <div className="card empty">No requests waiting. New online bookings show up here.</div>}
      <div className="stack">
        {rows.map((r) => (
          <div key={r.id} className="card stack" style={{ gap: 10 }}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div>
                <h2>{r.name}</h2>
                <a href={`tel:${r.phone}`} className="small" style={{ color: "var(--teal)" }}>{r.phone}</a>
              </div>
              {r.total > 0 && <span className="num" style={{ fontWeight: 800 }}>{money(r.total)}</span>}
            </div>
            <p><strong>{vehicleName(r)}</strong>{r.service ? ` · ${r.service}` : ""}</p>
            {r.concern && <p className="muted">{r.concern}</p>}
            <p className="small">{fmtWhen(r.at)}{r.address ? ` · ${r.address}` : ""}</p>
            <div className="row wrap" style={{ marginTop: 4 }}>
              <form action={acceptRequest}><input type="hidden" name="id" value={r.id} /><button className="btn">Accept</button></form>
              <Link href={`/hq/jobs/${r.id}`} className="btn ghost">Open</Link>
              <form action={declineRequest}><input type="hidden" name="id" value={r.id} /><button className="btn danger">Decline</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
