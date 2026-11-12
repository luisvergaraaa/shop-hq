export const STATUSES = [
  { key: "requested", label: "Requested" },
  { key: "scheduled", label: "Scheduled" },
  { key: "en_route", label: "En route" },
  { key: "diagnosing", label: "Diagnosing" },
  { key: "awaiting_approval", label: "Awaiting approval" },
  { key: "in_progress", label: "Repairing" },
  { key: "complete", label: "Complete" },
  { key: "declined", label: "Declined" },
] as const;

export function statusLabel(key: string) {
  return STATUSES.find((s) => s.key === key)?.label || key;
}

export const EXPENSE_CATEGORIES = ["Parts", "Fuel", "Tools", "Software & subscriptions", "Insurance", "Marketing", "Vehicle upkeep", "Other"];
