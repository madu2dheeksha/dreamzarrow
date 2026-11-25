import "server-only";
import { requireDb } from "./db";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "site_visit_requested",
  "site_visit_scheduled",
  "negotiation",
  "converted",
  "lost",
  "opted_out",
  "human_handover",
] as const;

/** Strip characters that have meaning in PostgREST filter syntax. */
const safe = (s: string) => s.replace(/[,()%*\\:"']/g, " ").trim().slice(0, 80);

export function leadQuery(params: URLSearchParams, columns = "*") {
  let q = requireDb().from("leads").select(columns, { count: "exact" });
  const search = safe(params.get("q") ?? "");
  if (search) {
    const digits = search.replace(/\D/g, "");
    const ors = [`customer_name.ilike.%${search}%`, `email.ilike.%${search}%`, `preferred_location.ilike.%${search}%`, `property_interest.ilike.%${search}%`];
    if (digits.length >= 4) ors.push(`phone_number.ilike.%${digits}%`);
    q = q.or(ors.join(","));
  }
  const category = params.get("category");
  if (category && ["new", "hot", "warm", "cold"].includes(category)) q = q.eq("lead_category", category);
  const status = params.get("status");
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) q = q.eq("lead_status", status);
  const location = safe(params.get("location") ?? "");
  if (location) q = q.ilike("preferred_location", `%${location}%`);
  const minBudget = Number(params.get("minBudget"));
  if (minBudget > 0) q = q.gte("budget_max", minBudget);
  const maxBudget = Number(params.get("maxBudget"));
  if (maxBudget > 0) q = q.lte("budget_min", maxBudget);
  const assigned = params.get("assigned");
  if (assigned === "none") q = q.is("assigned_salesperson", null);
  else if (assigned && /^[0-9a-f-]{36}$/i.test(assigned)) q = q.eq("assigned_salesperson", assigned);
  if (params.get("handover") === "1") q = q.eq("human_handover", true);
  return q.order(params.get("sort") === "score" ? "lead_score" : "updated_at", { ascending: false });
}

/** CSV cell escaping, including protection against spreadsheet formula injection. */
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
