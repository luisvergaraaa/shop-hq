import Link from "next/link";
import { AREA_309, PROSPECT_CATEGORIES, prospectingEnabled } from "@/lib/prospect";
import { findProspects } from "../crm-actions";

export const maxDuration = 60;

export default async function Prospect({ searchParams }: { searchParams: Promise<{ added?: string; skipped?: string; c?: string; e?: string }> }) {
  const { added, skipped, c, e } = await searchParams;
  const on = prospectingEnabled();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>Find leads</h1><p className="muted">Local businesses in the 309 that run vehicles and may need a mobile diagnostic partner. They land in Leads with their phone number, ready to call.</p></div>
      </div>
      {!on && <div className="notice">Lead finder isn't connected yet. Add <b>GOOGLE_PLACES_KEY</b> (a Google Maps Places API key) in Vercel → Settings → Environment Variables, then redeploy.</div>}
      {e === "fail" && <div className="notice">Google didn't answer. Try again in a moment.</div>}
      {added !== undefined && (
        <div className="notice">Added {added} business{added === "1" ? "" : "es"} from {c}{skipped && Number(skipped) > 0 ? ` (skipped ${skipped} already in your leads)` : ""}. <Link href="/hq/leads?view=new" style={{ textDecoration: "underline", fontWeight: 700 }}>Open leads</Link></div>
      )}
      <form action={findProspects} className="card stack">
        <div className="fields three">
          <div className="field"><label>Type of business</label><select name="category">{PROSPECT_CATEGORIES.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></div>
          <div className="field"><label>Town</label><select name="city">{AREA_309.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <button className="btn" disabled={!on}>Find businesses</button>
        <p className="tiny">Businesses only, using the phone numbers they publish themselves. Call during business hours, say who you are, and stop if they ask. Fleet owners (landscapers, contractors, delivery) are usually your best repeat customers.</p>
      </form>
    </div>
  );
}
