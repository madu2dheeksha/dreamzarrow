import { requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";

function istMidnightUtc(now = new Date()) {
  const ist = new Date(now.getTime() + 330 * 60_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 330 * 60_000).toISOString();
}

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const sb = requireDb();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => (await q).count ?? 0;
  const leads = () => sb.from("leads").select("id", { count: "exact", head: true });

  const [total, today, hot, warm, cold, siteVisits, converted, pendingFollowups, openHandovers] = await Promise.all([
    count(leads()),
    count(leads().gte("created_at", istMidnightUtc())),
    count(leads().eq("lead_category", "hot")),
    count(leads().eq("lead_category", "warm")),
    count(leads().eq("lead_category", "cold")),
    count(leads().in("lead_status", ["site_visit_requested", "site_visit_scheduled"])),
    count(leads().eq("lead_status", "converted")),
    count(sb.from("followups").select("id", { count: "exact", head: true }).eq("followup_status", "pending")),
    count(leads().eq("human_handover", true).not("lead_status", "in", "(converted,lost,opted_out)")),
  ]);
  return Response.json({ total, today, hot, warm, cold, siteVisits, converted, pendingFollowups, openHandovers });
}
