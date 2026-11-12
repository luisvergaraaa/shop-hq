import { sql } from "@/lib/db";
import { money, fmtDate, todayLocal } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/status";
import { addExpense, deleteExpense } from "../actions";

export default async function Expenses() {
  const today = todayLocal();
  const monthStart = today.slice(0, 8) + "01";
  let rows: any[] = [], byCat: any[] = [];
  try {
    [rows, byCat] = await Promise.all([
      sql`select id, to_char(spent_on,'YYYY-MM-DD') as day, category, amount_cents, note from expenses order by spent_on desc, id desc limit 200`,
      sql`select category, sum(amount_cents)::int as total from expenses where spent_on >= ${monthStart}::date group by category order by total desc`,
    ]);
  } catch {}
  const monthTotal = byCat.reduce((t, c) => t + c.total, 0);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><h1>Expenses</h1></div>
      <form action={addExpense} className="card stack">
        <div className="fields three">
          <div className="field"><label>Amount</label><input name="amount" inputMode="decimal" placeholder="$0.00" required /></div>
          <div className="field"><label>Category</label><select name="category">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Date</label><input name="spent_on" type="date" defaultValue={today} /></div>
        </div>
        <div className="field"><label>Note</label><input name="note" placeholder="Autel subscription renewal" /></div>
        <button className="btn">Add expense</button>
      </form>
      <div className="card stack">
        <div className="row between"><h2>This month</h2><span className="num" style={{ fontWeight: 800, fontSize: 20 }}>{money(monthTotal)}</span></div>
        {byCat.length === 0 && <p className="muted small">No expenses this month.</p>}
        {byCat.map((c) => (
          <div key={c.category}>
            <div className="row between small"><span>{c.category}</span><span className="num">{money(c.total)}</span></div>
            <div className="bar" style={{ marginTop: 6 }}><span style={{ width: `${(c.total / monthTotal) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="card list">
        {rows.map((r) => (
          <div key={r.id} className="list-item">
            <div><h3>{r.category}</h3><p className="muted small">{fmtDate(r.day)}{r.note ? ` · ${r.note}` : ""}</p></div>
            <div className="row"><span className="num" style={{ fontWeight: 800 }}>{money(r.amount_cents)}</span>
              <form action={deleteExpense}><input type="hidden" name="id" value={r.id} /><button className="btn danger small" aria-label="Delete">✕</button></form></div>
          </div>
        ))}
      </div>
    </div>
  );
}
