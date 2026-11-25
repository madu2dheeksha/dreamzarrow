import { z } from "zod";
import { readJson, requireStaff } from "@/lib/automation/admin-auth";
import { getLead, updateLead } from "@/lib/automation/leads";
import { sendToLead } from "@/lib/automation/messaging";

/**
 * Staff send a WhatsApp message to a lead from the dashboard.
 * Free-form text only works within 24h of the customer's last message (WhatsApp rule).
 * Sending as a human automatically pauses the AI for that chat, so they never talk over each other.
 */
export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({ leadId: z.uuid(), text: z.string().trim().min(1).max(4000) })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });

  let lead = await getLead(parsed.data.leadId);
  if (!lead) return Response.json({ error: "not_found" }, { status: 404 });
  if (!lead.human_handover) {
    lead = await updateLead(lead.id, {
      human_handover: true,
      handover_at: new Date().toISOString(),
      handover_reason: `${auth.staff.full_name} replied manually`,
      assigned_salesperson: lead.assigned_salesperson ?? auth.staff.id,
    });
  }
  const r = await sendToLead(lead, { kind: "text", body: parsed.data.text }, "staff", { staffId: auth.staff.id });
  if (!r.ok) {
    const message =
      r.reason === "outside_window"
        ? "More than 24 hours have passed since the customer's last message, so WhatsApp only allows approved templates. Please call the customer instead."
        : r.reason === "opted_out"
          ? "This customer has opted out of WhatsApp messages."
          : r.reason === "not_configured"
            ? "WhatsApp is not configured yet."
            : `WhatsApp rejected the message: ${r.error ?? r.reason}`;
    return Response.json({ ok: false, reason: r.reason, message }, { status: 409 });
  }
  return Response.json({ ok: true, id: r.id });
}
