import { z } from "zod";
import { readJson, requireStaff } from "@/lib/automation/admin-auth";
import { getLead, updateLead } from "@/lib/automation/leads";

/**
 * takeover: a salesperson takes the chat; the AI stops replying immediately.
 * resume:   hand the chat back to the AI assistant.
 */
export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({ leadId: z.uuid(), action: z.enum(["takeover", "resume"]), note: z.string().max(300).optional() })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });
  const lead = await getLead(parsed.data.leadId);
  if (!lead) return Response.json({ error: "not_found" }, { status: 404 });

  const updated =
    parsed.data.action === "takeover"
      ? await updateLead(lead.id, {
          human_handover: true,
          handover_at: new Date().toISOString(),
          handover_reason: `Taken over by ${auth.staff.full_name}${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
          assigned_salesperson: lead.assigned_salesperson ?? auth.staff.id,
          lead_status: ["new", "contacted", "qualified"].includes(lead.lead_status) ? "human_handover" : lead.lead_status,
        })
      : await updateLead(lead.id, {
          human_handover: false,
          handover_reason: null,
          lead_status: lead.lead_status === "human_handover" ? "contacted" : lead.lead_status,
        });
  return Response.json({ lead: updated });
}
