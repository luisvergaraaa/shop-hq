import { SHOP } from "@/lib/config";
import { NavList } from "../NavList";
import { getCounts } from "../data";
import { logout } from "../../login/actions";

export default async function MorePage() {
  const { counts } = await getCounts();
  const initials = (process.env.ADMIN_EMAIL || "Me").slice(0, 2).toUpperCase();
  return (
    <div>
      <h1>Everything</h1>
      <NavList counts={counts} />
      <div className="row between" style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <strong>{initials}</strong>
        <span className="muted small">{SHOP.name}</span>
        <form action={logout}><button className="btn ghost small" type="submit">Sign out</button></form>
      </div>
    </div>
  );
}
