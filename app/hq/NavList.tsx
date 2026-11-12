"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { NAV, type Counts } from "./nav";

function isActive(path: string, href: string) {
  return href === "/hq" ? path === "/hq" : path === href || path.startsWith(href + "/");
}

export function NavList({ counts }: { counts: Counts }) {
  const path = usePathname();
  return (
    <nav>
      {NAV.map((sec) => (
        <div className="nav-section" key={sec.section}>
          <div className="eyebrow"><Icon name={sec.icon} size={20} />{sec.section}</div>
          {sec.items.map((it) => {
            const n = it.badge ? counts[it.badge] : 0;
            return (
              <Link key={it.href} href={it.href} className={`nav-item${isActive(path, it.href) ? " active" : ""}`}>
                <span>{it.label}</span>
                {n > 0 && <span className="badge">{n}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const TABS = [
  { href: "/hq", label: "Overview", icon: "home", badge: "today" },
  { href: "/hq/requests", label: "Requests", icon: "inbox", badge: "requested" },
  { href: "/hq/jobs", label: "Jobs", icon: "wrench" },
  { href: "/hq/customers", label: "Customers", icon: "users" },
  { href: "/hq/more", label: "More", icon: "more" },
] as const;

export function TabBar({ counts }: { counts: Counts }) {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const active = t.href === "/hq/more"
          ? path === "/hq/more" || !TABS.slice(0, 4).some((x) => isActive(path, x.href))
          : isActive(path, t.href);
        const n = "badge" in t ? counts[t.badge as keyof Counts] : 0;
        return (
          <Link key={t.href} href={t.href} className={`tab${active ? " active" : ""}`}>
            {n > 0 && <span className="pip" />}
            <Icon name={t.icon} size={26} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
