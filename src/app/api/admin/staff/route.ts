import { z } from "zod";
import { readJson, requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";
import { normalizePhone } from "@/lib/automation/phone";

/** Everyone can see the team (for assignment); only owners can add or change people. */
export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { data, error } = await requireDb().from("staff").select("*").order("full_name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ staff: data ?? [] });
}

const phone = z
  .string()
  .trim()
  .max(20)
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Invalid WhatsApp number" });
    return n;
  });

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["owner"]);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({
      full_name: z.string().trim().min(2).max(80),
      email: z.email().max(120),
      password: z.string().min(10).max(72),
      role: z.enum(["owner", "sales"]),
      whatsapp_number: phone.optional(),
      notify_whatsapp: z.boolean().optional(),
      notify_email: z.boolean().optional(),
    })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422 });
  const sb = requireDb();
  const { password, ...profile } = parsed.data;
  const { data: created, error } = await sb.auth.admin.createUser({ email: profile.email, password, email_confirm: true });
  if (error || !created.user) return Response.json({ error: error?.message ?? "could_not_create_user" }, { status: 400 });
  const { data, error: insErr } = await sb
    .from("staff")
    .insert({ id: created.user.id, ...profile, whatsapp_number: profile.whatsapp_number ?? null })
    .select("*")
    .single();
  if (insErr) {
    await sb.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: insErr.message }, { status: 500 });
  }
  return Response.json({ staff: data });
}

export async function PATCH(request: Request) {
  const auth = await requireStaff(request, ["owner"]);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({
      id: z.uuid(),
      full_name: z.string().trim().min(2).max(80).optional(),
      role: z.enum(["owner", "sales"]).optional(),
      whatsapp_number: phone.optional(),
      notify_whatsapp: z.boolean().optional(),
      notify_email: z.boolean().optional(),
      active: z.boolean().optional(),
    })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422 });
  const { id, ...patch } = parsed.data;
  if (id === auth.staff.id && (patch.active === false || patch.role === "sales")) {
    return Response.json({ error: "You cannot deactivate or demote yourself." }, { status: 400 });
  }
  const { data, error } = await requireDb().from("staff").update(patch).eq("id", id).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ staff: data });
}
