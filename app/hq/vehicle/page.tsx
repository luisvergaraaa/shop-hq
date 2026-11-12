import { aiEnabled, aiCall } from "@/lib/ai";

export const maxDuration = 60;

type Sp = { vin?: string; year?: string; make?: string; model?: string; q?: string };
const GET = async (url: string) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};
const enc = encodeURIComponent;

const TECH_VOICE = `You are Torque, a diagnostic helper for a one-person mobile vehicle diagnostic business. You are NOT a source of factory data. Give a practical test plan: most likely causes first, what to measure (generic expected ranges only when they are well known), and in what order. Never state wire colors, connector pin numbers, torque specs, fuse locations or exact diagnostic values for a specific vehicle as facts; instead say "confirm in ProDemand". If unsure, say so. Never claim to show a wiring diagram. Plain text, short lines or dashes, no markdown headings, under 250 words.`;

export default async function VehicleInfo({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const vin = (sp.vin || "").trim().toUpperCase();
  let year = (sp.year || "").trim(), make = (sp.make || "").trim(), model = (sp.model || "").trim();
  const q = (sp.q || "").trim();
  let decoded: any = null, note = "";

  if (vin) {
    if (vin.length !== 17) note = "A VIN is 17 characters. Check it and try again.";
    else {
      const d = await GET(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${enc(vin)}?format=json`);
      const r = d?.Results?.[0];
      if (r && r.Make) { decoded = r; year = r.ModelYear; make = r.Make; model = r.Model; }
      else note = "Couldn't decode that VIN right now.";
    }
  }
  const have = Boolean(year && make && model);
  let recalls: any[] = [], complaints: any[] = [];
  if (have) {
    const [rc, cp] = await Promise.all([
      GET(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${enc(make)}&model=${enc(model)}&modelYear=${enc(year)}`),
      GET(`https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${enc(make)}&model=${enc(model)}&modelYear=${enc(year)}`),
    ]);
    recalls = rc?.results || [];
    complaints = cp?.results || [];
  }
  const byComp: Record<string, number> = {};
  for (const c of complaints) for (const p of String(c.components || "OTHER").split(",")) byComp[p.trim()] = (byComp[p.trim()] || 0) + 1;
  const topComps = Object.entries(byComp).sort((a, b) => b[1] - a[1]).slice(0, 6);

  let answer = "", aiNote = "";
  if (q) {
    if (!aiEnabled()) aiNote = "AI isn't connected yet. Add ANTHROPIC_API_KEY in Vercel, then redeploy.";
    else {
      const veh = have ? `${year} ${make} ${model}${decoded?.EngineModel ? ", engine " + decoded.EngineModel : ""}${decoded?.DisplacementL ? " " + decoded.DisplacementL + "L" : ""}` : "vehicle not specified";
      const ai = await aiCall(TECH_VOICE, `VEHICLE: ${veh}\n\nQUESTION: ${q}`, 700);
      if (ai.text) answer = ai.text; else aiNote = "The AI didn't answer. Try again in a moment.";
    }
  }
  const label = have ? `${year} ${make} ${model}` : "";

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Vehicle info</h1><p className="muted">Decode a VIN, check recalls, and get a test plan. For wiring diagrams, open ProDemand.</p></div></div>

      <form className="card stack" method="get">
        <h2>Find a vehicle</h2>
        <input name="vin" placeholder="VIN (17 characters), or fill in year, make, model below" defaultValue={vin} maxLength={17} />
        <div className="row wrap">
          <input name="year" placeholder="Year" defaultValue={year} style={{ width: 90 }} />
          <input name="make" placeholder="Make" defaultValue={make} style={{ flex: 1, minWidth: 120 }} />
          <input name="model" placeholder="Model" defaultValue={model} style={{ flex: 1, minWidth: 120 }} />
        </div>
        <textarea name="q" placeholder="Optional: what's wrong? e.g. P0301 misfire on cylinder 1, rough idle cold" defaultValue={q} style={{ minHeight: 70 }} />
        <div className="row wrap">
          <button className="btn">Look up</button>
          <a className="btn ghost" href="https://mitchell1.com/prodemand/" target="_blank" rel="noopener noreferrer">Open ProDemand ↗</a>
        </div>
        {label && <p className="small">Looking at <b>{label}</b>. ProDemand can't be pre-filled from here, so enter this in its vehicle selector.</p>}
        {note && <p className="small" style={{ color: "var(--accent-text)" }}>{note}</p>}
      </form>

      {decoded && (
        <div className="card stack" style={{ gap: 6 }}>
          <h2>{label}{decoded.Trim ? ` ${decoded.Trim}` : ""}</h2>
          <p className="small">{[decoded.BodyClass, decoded.DriveType, decoded.FuelTypePrimary].filter(Boolean).join(" · ")}</p>
          <p className="small">Engine: {[decoded.DisplacementL && decoded.DisplacementL + "L", decoded.EngineCylinders && decoded.EngineCylinders + " cyl", decoded.EngineModel].filter(Boolean).join(" · ") || "not listed"}</p>
          <p className="tiny">Source: NHTSA VIN decoder. Confirm engine and options on the vehicle before ordering parts.</p>
        </div>
      )}

      {q && (
        <div className="card stack">
          <h2>Torque's test plan</h2>
          {aiNote && <p className="small">{aiNote}</p>}
          {answer && <div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{answer}</div>}
          <p className="tiny">AI guidance, not factory data. Confirm wire colors, pins, specs and procedures in ProDemand before you cut, probe or replace anything.</p>
        </div>
      )}

      {have && (
        <div className="card stack">
          <h2>Recalls ({recalls.length})</h2>
          {recalls.length === 0 && <p className="muted small">No recalls found for {label}, or the lookup didn't respond. Check nhtsa.gov/recalls with the VIN to be sure.</p>}
          {recalls.slice(0, 8).map((r) => (
            <div key={r.NHTSACampaignNumber} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div className="row" style={{ gap: 8 }}><h3 style={{ fontSize: 15 }}>{r.Component}</h3><span className="tiny">{r.NHTSACampaignNumber}</span></div>
              <p className="small" style={{ marginTop: 2 }}>{String(r.Summary || "").slice(0, 260)}{String(r.Summary || "").length > 260 ? "…" : ""}</p>
              {r.Remedy && <p className="tiny" style={{ marginTop: 2 }}>Fix: {String(r.Remedy).slice(0, 160)}{String(r.Remedy).length > 160 ? "…" : ""}</p>}
            </div>
          ))}
          {recalls.length > 8 && <p className="tiny">Showing 8 of {recalls.length}.</p>}
        </div>
      )}

      {have && complaints.length > 0 && (
        <div className="card stack" style={{ gap: 6 }}>
          <h2>Common owner complaints ({complaints.length})</h2>
          <p className="muted small">Most-reported problem areas for {label}, a good hint on where to look first.</p>
          {topComps.map(([name, n]) => (
            <div key={name} className="row" style={{ justifyContent: "space-between" }}><span className="small">{name}</span><span className="small">{n}</span></div>
          ))}
          <p className="tiny">Source: NHTSA owner complaints. Not a diagnosis.</p>
        </div>
      )}
    </div>
  );
}
