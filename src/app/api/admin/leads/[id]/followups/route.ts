import { z } from "zod";
import { isUuid, readJson, requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";

/** Manual follow-up reminders (call, WhatsApp, site visit) shown in the dashboard's follow-up list. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/leads/[id]/followups">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z
    .object({
      followup_date: z.iso.datetime({ offset: true }),
      followup_type: z.enum(["call", "whatsapp", "site_visit", "other"]),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422 });
  const sb = requireDb();
  const { data, error } = await sb
    .from("followups")
    .insert({ lead_id: id, ...parsed.data, created_by: auth.staff.id })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (parsed.data.followup_type === "site_visit") {
    await sb.from("leads").update({ lead_status: "site_visit_scheduled" }).eq("id", id);
  }
  return Response.json({ followup: data });
}
