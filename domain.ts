export const statuses = ["New", "Contacted", "Won", "Lost"] as const;
export type Status = (typeof statuses)[number];
export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: Status;
  notes: string;
  created_at: string;
}
export type LeadInput = Pick<
  Lead,
  "name" | "email" | "phone" | "company" | "status" | "notes"
>;
export const blankLead: LeadInput = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "New",
  notes: "",
};
export function validateLead(input: LeadInput): string | null {
  if (!input.name.trim()) return "A lead name is required.";
  if (input.name.trim().length > 120)
    return "Name must be 120 characters or fewer.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    return "Enter a valid email address.";
  if (
    input.email.length > 254 ||
    input.phone.length > 40 ||
    input.company.length > 160 ||
    input.notes.length > 5000
  )
    return "One or more fields exceed their character limit.";
  if (!statuses.includes(input.status)) return "Choose a valid status.";
  return null;
}
export function filterLeads(leads: Lead[], query: string, status: string) {
  const q = query.toLowerCase().trim();
  return leads.filter(
    (l) =>
      (status === "All" || l.status === status) &&
      [l.name, l.email, l.phone, l.company, l.notes].some((v) =>
        v.toLowerCase().includes(q),
      ),
  );
}
export function summarize(leads: Lead[]) {
  return {
    Total: leads.length,
    ...Object.fromEntries(
      statuses.map((s) => [s, leads.filter((l) => l.status === s).length]),
    ),
  } as Record<"Total" | Status, number>;
}
const samples: Array<[string, string, string, Status, string]> = [
  [
    "Amara Okafor",
    "amara@northstar.example",
    "Northstar Studio",
    "New",
    "Interested in a website refresh. Follow up with a discovery call.",
  ],
  [
    "Daniel Mensah",
    "daniel@atlas.example",
    "Atlas Logistics",
    "Contacted",
    "Proposal shared. Check back next week.",
  ],
  [
    "Sofia Chen",
    "sofia@bloom.example",
    "Bloom & Co.",
    "Won",
    "Signed the starter package. Arrange onboarding.",
  ],
  [
    "James Williams",
    "james@bright.example",
    "Brightside Digital",
    "New",
    "Referred by a previous client.",
  ],
  [
    "Zainab Bello",
    "zainab@haven.example",
    "Haven Interiors",
    "Contacted",
    "Looking for a customer booking experience.",
  ],
  [
    "Oliver Park",
    "oliver@fieldwork.example",
    "Fieldwork",
    "Lost",
    "Project postponed. Reconnect next quarter.",
  ],
  [
    "Chidinma Eze",
    "chidinma@olive.example",
    "Olive Market",
    "Won",
    "E-commerce project confirmed.",
  ],
  [
    "Lucas Martins",
    "lucas@orbit.example",
    "Orbit Labs",
    "Contacted",
    "Needs a lead capture landing page.",
  ],
];
export function demoLeads(): Lead[] {
  return samples.map(([name, email, company, status, notes], i) => ({
    id: crypto.randomUUID(),
    user_id: "demo-only",
    name,
    email,
    company,
    status,
    notes,
    phone: `+234 800 555 ${String(1000 + i)}`,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}
