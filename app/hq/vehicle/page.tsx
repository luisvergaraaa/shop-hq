import { aiEnabled, aiCall } from "@/lib/ai";
import { ensureSchema, sql } from "@/lib/db";
import { saveRepairNote, deleteRepairNote } from "./actions";

export const maxDuration = 60;

type Sp = { vin?: string; year?: string; make?: string; model?: string; q?: string; saved?: string; lib?: string };
const GET = async (url: string) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};
const enc = encodeURIComponent;

const TECH_VOICE = `You are Torque, the built-in diagnostic reference for a one-person mobile vehicle diagnostic business. You do NOT have factory wiring diagrams or OEM data, so never state wire colors, connector pin numbers, torque specs, fuse positions or exact vehicle-specific values as facts; for those say "verify with factory info". Generic, widely known values (battery 12.4-12.7V off, charging 13.8-14.7V, fuel trim +/-10%, etc.) are fine and should be labeled typical.

Reply in EXACTLY this layout, plain text, no markdown symbols:
SUMMARY: one or two sentences on what is probably going on.
LIKELY CAUSES:
1. cause (most likely first, mention known issues for this platform only if you are confident)
2. ...
TEST PLAN:
1. step: what to check, with the tool to use and what a good vs bad result looks like (typical values only)
2. ...
FLOW: the signal or circuit path for the suspect system as 4-7 short generic nodes joined by " > ", e.g. Battery > Fuse > Fuel pump relay > Pump > Rail pressure sensor > PCM
WATCH OUT: one or two cautions (safety, easy-to-miss things, what not to replace yet).
Keep it under 330 words total.`;

const SECTION_RE = /^(SUMMARY|LIKELY CAUSES|TEST PLAN|FLOW|WATCH OUT):\s*/;
function parse(text: string) {
  const out: Record<string, string> = {};
  let cur = "";
  for (const line of text.split("\n")) {
    const m = line.match(SECTION_RE);
    if (m) { cur = m[1]; out[cur] = line.replace(SECTION_RE, ""); }
    else if (cur) out[cur] += "\n" + line;
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

function FlowDiagram({ flow }: { flow: string }) {
  const nodes = flow.split(">").map((n) => n.trim()).filter(Boolean).slice(0, 8);
  if (nodes.length < 2) return null;
  const w = 118, gap = 26, h = 46;
  const width = nodes.length * w + (nodes.length - 1) * gap + 4;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={h + 4} role="img" aria-label="Generic signal path">
        {nodes.map((n, i) => {
          const x = 2 + i * (w + gap);
          const words = n.split(" ");
          const l1 = words.slice(0, Math.ceil(words.length / 2)).join(" "), l2 = words.slice(Math.ceil(words.length / 2)).join(" ");
          return (
            <g key={i}>
              <rect x={x} y={2} width={w} height={h} rx={8} fill="none" stroke="currentColor" strokeOpacity={0.45} />
              <text x={x + w / 2} y={l2 ? 20 : 30} textAnchor="middle" fontSize={12} fill="currentColor">{l1.slice(0, 18)}</text>
              {l2 && <text x={x + w / 2} y={36} textAnchor="middle" fontSize={12} fill="currentColor">{l2.slice(0, 18)}</text>}
              {i < nodes.length - 1 && <path d={`M${x + w + 3} ${2 + h / 2} H${x + w + gap - 3} m-5 -4 l5 4 l-5 4`} fill="none" stroke="currentColor" strokeOpacity={0.7} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
      const ai = await aiCall(TECH_VOICE, `VEHICLE: ${veh}\n\nQUESTION: ${q}`, 1200);
      if (ai.text) answer = ai.text; else aiNote = "The AI didn't answer. " + (ai.error ? "Reason: " + ai.error.slice(0, 160) : "Try again in a moment.");
    }
  }
  let notes: any[] = [];
  try {
    await ensureSchema();
    if (have) notes = await sql`select id, year, code, symptom, fix, notes, to_char(created_at at time zone 'America/Chicago','Mon DD YYYY') as at from repair_notes where lower(make) = lower(${make}) and lower(model) = lower(${model}) order by id desc limit 30`;
    else if (sp.lib) notes = await sql`select id, vehicle, year, code, symptom, fix, notes, to_char(created_at at time zone 'America/Chicago','Mon DD YYYY') as at from repair_notes order by id desc limit 30`;
  } catch {}
  const parsed = answer ? parse(answer) : null;
  const label = have ? `${year} ${make} ${model}` : "";

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Vehicle info</h1><p className="muted">Decode a VIN, check recalls, get a diagnostic plan with a signal-path diagram, and keep your own repair notes.</p></div></div>

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
          <a className="btn ghost" href="/hq/vehicle?lib=1">My repair library</a>
        </div>
        {label && <p className="small">Looking at <b>{label}</b>.</p>}
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
          <h2>Torque's diagnostic plan{label ? ` for ${label}` : ""}</h2>
          {aiNote && <p className="small">{aiNote}</p>}
          {parsed && Object.keys(parsed).length > 0 ? (
            <>
              {parsed["SUMMARY"] && <p>{parsed["SUMMARY"]}</p>}
              {parsed["LIKELY CAUSES"] && <div><h3 style={{ fontSize: 15 }}>Likely causes</h3><div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{parsed["LIKELY CAUSES"]}</div></div>}
              {parsed["TEST PLAN"] && <div><h3 style={{ fontSize: 15 }}>Test plan</h3><div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{parsed["TEST PLAN"]}</div></div>}
              {parsed["FLOW"] && <div><h3 style={{ fontSize: 15 }}>Signal path (generic, not vehicle-specific)</h3><FlowDiagram flow={parsed["FLOW"]} /></div>}
              {parsed["WATCH OUT"] && <div><h3 style={{ fontSize: 15 }}>Watch out</h3><div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{parsed["WATCH OUT"]}</div></div>}
            </>
          ) : answer ? <div className="ai-answer" style={{ whiteSpace: "pre-wrap" }}>{answer}</div> : null}
          <p className="tiny">AI guidance, not factory data. Wire colors, pinouts, specs and torque values are not included on purpose; verify those with factory info before you cut, probe or replace anything.</p>
        </div>
      )}

      {(have || sp.lib) && (
        <div className="card stack">
          <h2>{have ? `Your repair notes for ${make} ${model}` : "My repair library"} ({notes.length})</h2>
          {sp.saved === "1" && <p className="small" style={{ color: "var(--teal)" }}>Saved.</p>}
          {sp.saved === "0" && <p className="small" style={{ color: "var(--accent-text)" }}>Add at least a fix, symptom or note.</p>}
          {notes.length === 0 && <p className="muted small">{have ? "Nothing saved for this model yet. Save what you find on each job below and it will show up here next time." : "No notes yet. Look up a vehicle and save your first one."}</p>}
          {notes.map((n) => (
            <div key={n.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
                <b className="small">{[n.vehicle || n.year, n.code].filter(Boolean).join(" · ")}</b>
                <span className="tiny">{n.at}</span>
              </div>
              {n.symptom && <p className="small">Symptom: {n.symptom}</p>}
              {n.fix && <p className="small">Fix: {n.fix}</p>}
              {n.notes && <p className="tiny" style={{ whiteSpace: "pre-wrap" }}>{n.notes}</p>}
              <form action={deleteRepairNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="back" value={have ? `/hq/vehicle?year=${enc(year)}&make=${enc(make)}&model=${enc(model)}` : "/hq/vehicle?lib=1"} /><button className="btn ghost" style={{ marginTop: 4, fontSize: 12 }}>Delete</button></form>
            </div>
          ))}
          {have && (
            <form action={saveRepairNote} className="stack" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <h3 style={{ fontSize: 15 }}>Save a repair note</h3>
              <input type="hidden" name="year" value={year} /><input type="hidden" name="make" value={make} /><input type="hidden" name="model" value={model} />
              <input name="code" placeholder="Code(s), e.g. P0301" />
              <input name="symptom" placeholder="Symptom" />
              <textarea name="fix" placeholder="What fixed it (part, repair, test values you measured)" style={{ minHeight: 60 }} />
              <textarea name="notes" placeholder="Tips for next time: location of parts, tricks, wiring colors you verified" style={{ minHeight: 50 }} />
              <div><button className="btn">Save note</button></div>
            </form>
          )}
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
