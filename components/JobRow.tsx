import Link from "next/link";
import { fmtWhen, money, vehicleName } from "@/lib/format";
import { statusLabel } from "@/lib/status";

export function JobRow({ j, showDate = true }: { j: any; showDate?: boolean }) {
  return (
    <Link href={`/hq/jobs/${j.id}`} className="list-item">
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <h3 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.name}</h3>
          <span className={`chip ${j.paid_at ? "paid" : j.status}`}>{j.paid_at ? "Paid" : statusLabel(j.status)}</span>
        </div>
        <p className="muted small" style={{ marginTop: 2 }}>
          {vehicleName(j)}{j.service ? ` · ${j.service}` : ""}
        </p>
        <p className="small" style={{ marginTop: 2 }}>{fmtWhen(j.at, { date: showDate, time: true })}{j.address ? ` · ${j.address}` : ""}</p>
      </div>
      {j.total > 0 && <span className="num" style={{ fontWeight: 800 }}>{money(j.total)}</span>}
    </Link>
  );
}
