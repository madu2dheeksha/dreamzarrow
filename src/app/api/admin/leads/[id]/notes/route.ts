import { z } from "zod";
import { isUuid, readJson, requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/leads/[id]/notes">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z.object({ note: z.string().trim().min(1).max(4000) }).safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });
  const { data, error } = await requireDb()
    .from("lead_notes")
    .insert({ lead_id: id, author_id: auth.staff.id, note: parsed.data.note })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ note: data });
}
