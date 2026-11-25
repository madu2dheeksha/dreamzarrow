import "server-only";
import { requireDb } from "./db";
import { claimWebhookEvent, getLeadByPhone, updateLead } from "./leads";
import type { WaStatus } from "./whatsapp";

const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/** Applies a delivery receipt (sent → delivered → read, or failed) to the stored message. */
export async function handleStatus(s: WaStatus) {
  if (s.status === "deleted") return;
  if (!(await claimWebhookEvent(`status:${s.id}:${s.status}`))) return;
  const sb = requireDb();
  const { data: row } = await sb.from("conversations").select("id, delivery_status, lead_id").eq("whatsapp_message_id", s.id).maybeSingle();
  if (!row) return; // e.g. staff alerts, which are not stored as customer conversations
  // Receipts can arrive out of order; never move backwards (read must not become delivered).
  if ((RANK[s.status] ?? 0) <= (RANK[row.delivery_status] ?? 0) && s.status !== "failed") return;

  const err = s.errors?.[0];
  await sb
    .from("conversations")
    .update({
      delivery_status: s.status,
      ...(err ? { error: `${err.code} ${err.title ?? err.message ?? ""} ${err.error_data?.details ?? ""}`.trim().slice(0, 500) } : {}),
    })
    .eq("id", row.id);

  // 131050: the customer has turned off marketing messages from us in WhatsApp — treat as an opt-out for automation.
  if (s.status === "failed" && err?.code === 131050) {
    const lead = await getLeadByPhone(s.recipient_id);
    if (lead && !lead.opted_out) await updateLead(lead.id, { opted_out: true, opted_out_at: new Date().toISOString(), lead_status: "opted_out" });
  }
}
