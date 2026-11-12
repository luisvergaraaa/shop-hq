import { LEAD_SOURCES } from "@/lib/status";
import { addLead } from "../../crm-actions";

export default async function NewLead({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div>
      <div className="page-head"><h1>New lead</h1></div>
      {e && <div className="notice">Add the lead's name.</div>}
      <form action={addLead} className="card stack">
        <div className="fields three">
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
          <div className="field"><label>Email</label><input name="email" type="email" /></div>
        </div>
        <div className="fields three">
          <div className="field"><label>Where they came from</label><select name="source" defaultValue="Phone">{LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Vehicle</label><input name="vehicle" placeholder="2017 Honda Accord" /></div>
          <div className="field"><label>Follow up on</label><input name="follow_up" type="date" /></div>
        </div>
        <div className="field"><label>What they need</label><textarea name="notes" placeholder="Check engine light, misfires when cold…" /></div>
        <button className="btn">Add lead</button>
      </form>
    </div>
  );
}
