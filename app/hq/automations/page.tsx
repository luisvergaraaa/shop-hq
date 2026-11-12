import { AUTOMATIONS, enabledMap } from "@/lib/automations";
import { toggleAutomation, runAutomationsNow } from "../crm-actions";

export const maxDuration = 60;

export default async function Automations() {
  let en: Record<string, boolean> = {};
  try { en = await enabledMap(); } catch { for (const a of AUTOMATIONS) en[a.key] = true; }
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>Automations</h1><p className="muted">These watch your leads and jobs and write drafts for you. They never send anything on their own.</p></div>
        <form action={runAutomationsNow}><button className="btn">Run now</button></form>
      </div>
      <div className="card list">
        {AUTOMATIONS.map((a) => (
          <form key={a.key} action={toggleAutomation} className="list-item">
            <input type="hidden" name="key" value={a.key} />
            <div><h3>{a.title}</h3><p className="muted small">{a.desc}</p></div>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" name="enabled" defaultChecked={en[a.key]} />
              <button className="btn ghost small">Save</button>
            </label>
          </form>
        ))}
      </div>
      <p className="tiny">Tap Run now any time, or set CRON_SECRET in Vercel to have it run once a day on its own.</p>
    </div>
  );
}
