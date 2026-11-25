import "server-only";
import { FOLLOWUP_DELAYS_HOURS, templateNames, whatsappConfig } from "./config";
import { requireDb, type Lead } from "./db";
import { inServiceWindow, sendToLead } from "./messaging";

const firstName = (l: Lead) => l.customer_name.trim().split(/\s+/)[0] || "there";

/** Text used inside the 24h window (and as the preview of the matching template). */
export function followupText(stage: 1 | 2 | 3, lead: Lead) {
  const n = firstName(lead);
  switch (stage) {
    case 1:
      return `Hello ${n}! 😊\nJust checking if you're still exploring properties in Hyderabad.\nWe'd be happy to help you find options that match your budget and preferences.\nWould you like us to share some suitable properties?`;
    case 2:
      return `Hi ${n}, new homes are added to our listings regularly. If you share your preferred area and budget, we'll send you the best matches. Reply STOP if you'd prefer not to hear from us.`;
    case 3:
      return `Hi ${n}, this is our last check-in 🙂 Whenever you're ready to look at properties in Hyderabad, just message us here and our team will help. Thank you for considering DreaamzArrow Homes!`;
  }
}

const TEMPLATE_FOR = { 1: templateNames.followup1, 2: templateNames.followup2, 3: templateNames.followup3 } as const;

/** Statuses where the automated sequence must not run. */
const CLOSED = ["converted", "lost", "opted_out", "human_handover", "site_visit_scheduled", "negotiation"];

export type FollowupReport = { checked: number; sent: number; skipped: number; failed: number; details: string[] };

/**
 * Sends the automatic follow-ups that are due: 24h, 3 days and 7 days after the
 * customer went quiet. At most one per lead per run, never to anyone who opted out,
 * is being handled by a person, or never gave WhatsApp consent. The stage is
 * claimed atomically in the database first, so overlapping runs cannot double-send.
 */
export async function processDueFollowups(now = new Date()): Promise<FollowupReport> {
  const report: FollowupReport = { checked: 0, sent: 0, skipped: 0, failed: 0, details: [] };
  if (!whatsappConfig()) {
    report.details.push("WhatsApp not configured — nothing sent.");
    return report;
  }
  const sb = requireDb();
  const earliest = new Date(now.getTime() - FOLLOWUP_DELAYS_HOURS[0] * 3600_000).toISOString();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .eq("opted_out", false)
    .eq("human_handover", false)
    .eq("whatsapp_consent", true)
    .lt("followup_stage", 3)
    .not("silence_started_at", "is", null)
    .lte("silence_started_at", earliest)
    .not("lead_status", "in", `(${CLOSED.join(",")})`)
    .order("silence_started_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`follow-up query failed: ${error.message}`);

  for (const lead of (data as Lead[]) ?? []) {
    report.checked++;
    const stage = lead.followup_stage; // 0, 1 or 2 → sending follow-up #stage+1
    const dueAt = new Date(lead.silence_started_at!).getTime() + FOLLOWUP_DELAYS_HOURS[stage] * 3600_000;
    if (now.getTime() < dueAt) continue;

    // Customer replied after our last message: the sequence was reset; nothing to chase.
    if (lead.last_inbound_at && lead.last_outbound_at && lead.last_inbound_at > lead.last_outbound_at) {
      report.skipped++;
      continue;
    }

    const { data: claimed, error: claimErr } = await sb.rpc("claim_followup_stage", { p_lead_id: lead.id, p_expected_stage: stage });
    if (claimErr || claimed !== true) {
      report.skipped++;
      continue;
    }

    const n = (stage + 1) as 1 | 2 | 3;
    const text = followupText(n, lead);
    const outcome = inServiceWindow(lead, now.getTime())
      ? await sendToLead(lead, { kind: "text", body: text }, "system", { isFollowup: true })
      : await sendToLead(
          lead,
          { kind: "template", name: TEMPLATE_FOR[n], language: templateNames.language, params: [firstName(lead)], preview: text },
          "system",
          { isFollowup: true },
        );

    await sb.from("followups").insert({
      lead_id: lead.id,
      followup_date: now.toISOString(),
      followup_type: `auto_${n}`,
      followup_status: outcome.ok ? "sent" : "failed",
      completed_at: now.toISOString(),
      notes: outcome.ok ? null : `${outcome.reason}${outcome.error ? `: ${outcome.error}` : ""}`.slice(0, 500),
    });
    if (outcome.ok) report.sent++;
    else {
      report.failed++;
      report.details.push(`${lead.id}: ${outcome.reason}`);
    }
  }
  return report;
}
