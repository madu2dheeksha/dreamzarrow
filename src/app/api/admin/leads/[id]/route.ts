import { z } from "zod";
import { isUuid, readJson, requireStaff } from "@/lib/automation/admin-auth";
import { LEAD_STATUSES } from "@/lib/automation/admin-queries";
import { requireDb } from "@/lib/automation/db";
import { inServiceWindow } from "@/lib/automation/messaging";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/leads/[id]">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const sb = requireDb();
  const [lead, messages, notes, followups, enquiries] = await Promise.all([
    sb.from("leads").select("*").eq("id", id).maybeSingle(),
    sb.from("conversations").select("*").eq("lead_id", id).order("timestamp", { ascending: true }).limit(500),
    sb.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    sb.from("followups").select("*").eq("lead_id", id).order("followup_date", { ascending: false }),
    sb.from("lead_enquiries").select("id, intent, property, preferred_date, message, page, whatsapp_consent, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (!lead.data) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    lead: lead.data,
    canSendFreeform: inServiceWindow(lead.data),
    messages: messages.data ?? [],
    notes: notes.data ?? [],
    followups: followups.data ?? [],
    enquiries: enquiries.data ?? [],
  });
}

const patchSchema = z
  .object({
    lead_status: z.enum(LEAD_STATUSES),
    lead_category: z.enum(["new", "hot", "warm", "cold"]),
    assigned_salesperson: z.uuid().nullable(),
    customer_name: z.string().trim().min(2).max(80),
    email: z.union([z.email().max(120), z.literal("")]).transform((v) => v || null),
    property_type: z.string().max(40).nullable(),
    budget: z.string().max(80).nullable(),
    budget_min: z.number().nonnegative().nullable(),
    budget_max: z.number().nonnegative().nullable(),
    preferred_location: z.string().max(200).nullable(),
    configuration: z.string().max(60).nullable(),
    buying_timeline: z.enum(["immediate", "1_3_months", "3_6_months", "exploring"]).nullable(),
    preferred_callback_time: z.string().max(120).nullable(),
  })
  .partial()
  .strict();

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/leads/[id]">) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 422 });
  const patch: Record<string, unknown> = { ...parsed.data };
  // Opting someone out from the dashboard also stops automation.
  if (patch.lead_status === "opted_out") Object.assign(patch, { opted_out: true, opted_out_at: new Date().toISOString() });

  const sb = requireDb();
  const { data, error } = await sb.from("leads").update(patch).eq("id", id).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (["converted", "lost", "opted_out"].includes(String(patch.lead_status))) {
    await sb.from("followups").update({ followup_status: "cancelled" }).eq("lead_id", id).eq("followup_status", "pending");
  }
  return Response.json({ lead: data });
}
