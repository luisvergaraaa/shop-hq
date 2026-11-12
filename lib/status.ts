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

export const LEAD_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "booked", label: "Booked" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;
export const OPEN_STAGES = ["new", "contacted", "quoted", "booked"];
export const LEAD_SOURCES = ["Website", "Phone", "Text", "Facebook", "Referral", "Walk-up", "Prospecting", "Import", "Other"];
export function leadStageLabel(key: string) {
  return LEAD_STAGES.find((s) => s.key === key)?.label || key;
}
