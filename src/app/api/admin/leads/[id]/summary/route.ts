import { isUuid, requireStaff } from "@/lib/automation/admin-auth";
import { openaiConfig } from "@/lib/automation/config";
import { refreshSummary } from "@/lib/automation/conversation";
import { getLead } from "@/lib/automation/leads";

export const maxDuration = 30;

/** Regenerates the AI conversation summary for one lead. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/leads/[id]/summary">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  if (!openaiConfig()) return Response.json({ error: "ai_not_configured" }, { status: 503 });
  const lead = await getLead(id);
  if (!lead) return Response.json({ error: "not_found" }, { status: 404 });
  const updated = await refreshSummary(lead);
  return Response.json({ ai_summary: updated.ai_summary, ai_summary_at: updated.ai_summary_at });
}
