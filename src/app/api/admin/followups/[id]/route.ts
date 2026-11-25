import { z } from "zod";
import { isUuid, readJson, requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/followups/[id]">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z
    .object({
      followup_status: z.enum(["pending", "done", "skipped", "cancelled"]).optional(),
      followup_date: z.iso.datetime({ offset: true }).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .strict()
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });
  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.followup_status && parsed.data.followup_status !== "pending") patch.completed_at = new Date().toISOString();
  const { data, error } = await requireDb().from("followups").update(patch).eq("id", id).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ followup: data });
}
