import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SHOP } from "@/lib/config";
import { requireAdmin } from "@/lib/session";
import { NavList, TabBar } from "./NavList";
import { getCounts } from "./data";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { counts, dbReady } = await getCounts();
  const initials = (process.env.ADMIN_EMAIL || "Me").slice(0, 2).toUpperCase();
  const brand = (
    <Link href="/hq" className="brand">
      <Logo size={48} />
      <div style={{ minWidth: 0 }}>
        <div className="wordmark" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SHOP.name}</div>
        <div className="brand-sub"><span className="dot" /> Taking bookings</div>
      </div>
    </Link>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: "4px 6px 10px" }}>{brand}</div>
        <NavList counts={counts} />
        <div className="row between" style={{ marginTop: 28, padding: "16px 14px 0", borderTop: "1px solid var(--border)" }}>
          <strong>{initials}</strong>
          <form action={logout}><button className="btn ghost small" type="submit">Sign out</button></form>
        </div>
      </aside>
      <div>
        <header className="topbar">
          <div className="brand mobile-only">{brand}</div>
          <div className="row" style={{ marginLeft: "auto" }}>
            {counts.requested > 0 && <Link href="/hq/requests" className="pill">{counts.requested} waiting</Link>}
            <ThemeToggle />
          </div>
        </header>
        <main className="main">
          {!dbReady && (
            <div className="notice">
              Your database isn't connected or set up yet. <Link href="/hq/setup" style={{ textDecoration: "underline", fontWeight: 700 }}>Go to Setup</Link>
            </div>
          )}
          {children}
        </main>
      </div>
      <TabBar counts={counts} />
    </div>
  );
}
