import { importLeads } from "../crm-actions";

export default async function Import({ searchParams }: { searchParams: Promise<{ added?: string; skipped?: string; e?: string }> }) {
  const { added, skipped, e } = await searchParams;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>Import leads</h1><p className="muted">Bring in an existing list from a spreadsheet or another app.</p></div></div>
      {e && <div className="notice">I couldn't read that. Make sure the first row has headers including "name".</div>}
      {added !== undefined && <div className="notice">Added {added} lead{added === "1" ? "" : "s"}{skipped && Number(skipped) > 0 ? `, skipped ${skipped} duplicate or empty row(s)` : ""}.</div>}
      <form action={importLeads} className="card stack">
        <p className="small">Paste rows copied from a spreadsheet (or CSV text). The first row must be headers. Recognized headers: <b>name, phone, email, vehicle, notes, source</b>. Up to 500 rows; people whose phone number already exists are skipped.</p>
        <textarea name="csv" required style={{ minHeight: 220 }} placeholder={"name,phone,email,vehicle,notes\nJamie Lee,3095551212,,2015 Ford F-150,Misfire on cold start"} />
        <button className="btn">Import</button>
      </form>
    </div>
  );
}
