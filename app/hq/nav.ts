export type NavItem = { href: string; label: string; badge?: "today" | "requested" | "tasks" | "unpaid" | "leads" | "inbox" | "approvals" };
export const NAV: { section: string; icon: string; items: NavItem[] }[] = [
  { section: "Today", icon: "home", items: [
    { href: "/hq", label: "Overview", badge: "today" },
    { href: "/hq/requests", label: "Requests", badge: "requested" },
    { href: "/hq/calendar", label: "Calendar" },
    { href: "/hq/tasks", label: "Tasks", badge: "tasks" },
  ]},
  { section: "AI", icon: "spark", items: [
    { href: "/hq/assistant", label: "Torque assistant" },
    { href: "/hq/approvals", label: "Approvals", badge: "approvals" },
    { href: "/hq/insights", label: "Insights" },
  ]},
  { section: "Leads", icon: "users", items: [
    { href: "/hq/leads", label: "Leads", badge: "leads" },
    { href: "/hq/prospect", label: "Find leads" },
    { href: "/hq/inbox", label: "Inbox", badge: "inbox" },
    { href: "/hq/automations", label: "Automations" },
    { href: "/hq/import", label: "Import" },
  ]},
  { section: "Shop", icon: "wrench", items: [
    { href: "/hq/jobs", label: "Jobs" },
    { href: "/hq/customers", label: "Customers" },
    { href: "/hq/invoices", label: "Invoices", badge: "unpaid" },
  ]},
  { section: "Numbers", icon: "chart", items: [
    { href: "/hq/funnel", label: "Funnel" },
    { href: "/hq/report", label: "Weekly report" },
    { href: "/hq/expenses", label: "Expenses" },
  ]},
  { section: "Tools", icon: "sliders", items: [
    { href: "/hq/services", label: "Services & pricing" },
    { href: "/hq/setup", label: "Setup" },
  ]},
];
export type Counts = { today: number; requested: number; tasks: number; unpaid: number; leads: number; inbox: number; approvals: number };
