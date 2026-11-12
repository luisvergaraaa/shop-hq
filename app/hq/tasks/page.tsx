import { sql } from "@/lib/db";
import { fmtWhen } from "@/lib/format";
import { addTask, toggleTask, deleteTask } from "../actions";

export default async function Tasks() {
  let rows: any[] = [];
  try { rows = await sql`select id, title, done, to_char(due_on,'YYYY-MM-DD') as due from tasks order by done, due_on nulls last, id desc limit 200`; } catch {}
  return (
    <div>
      <div className="page-head"><h1>Tasks</h1></div>
      <form action={addTask} className="card row wrap" style={{ marginBottom: 16 }}>
        <input name="title" placeholder="Order O2 sensor for Garcia's Civic…" style={{ flex: "1 1 240px" }} required />
        <input name="due" type="date" style={{ width: 170 }} />
        <button className="btn">Add</button>
      </form>
      <div className="card list">
        {rows.length === 0 && <p className="empty">No tasks yet.</p>}
        {rows.map((t) => (
          <div key={t.id} className="list-item">
            <form action={toggleTask} className="row" style={{ flex: 1, minWidth: 0 }}>
              <input type="hidden" name="id" value={t.id} />
              <button className="btn ghost small" aria-label={t.done ? "Mark not done" : "Mark done"} style={{ width: 36, padding: 6 }}>{t.done ? "✓" : ""}</button>
              <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : undefined }}>{t.title}</span>
            </form>
            {t.due && <span className="muted small">{fmtWhen(t.due, { date: true, time: false })}</span>}
            <form action={deleteTask}><input type="hidden" name="id" value={t.id} /><button className="btn danger small">Delete</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
