import { after, NextResponse, type NextRequest } from "next/server";
import { enquirySchema, fieldErrorsFrom, type EnquiryResponse } from "@/lib/enquiry-schema";
import { deliverLead } from "@/lib/lead-delivery";
import { rateLimit, rememberSubmission } from "@/lib/rate-limit";
import { db } from "@/lib/automation/db";
import { saveLeadFromEnquiry, updateLead } from "@/lib/automation/leads";
import { startConversationFromEnquiry } from "@/lib/automation/conversation";
import { isWhatsAppConfigured } from "@/lib/automation/whatsapp";
import { notifyTeam } from "@/lib/automation/notify";

const json = (body: EnquiryResponse, status = 200) => NextResponse.json(body, { status });

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Only accept same-origin JSON posts from the site's own forms.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return json({ ok: false, error: "bad_request" }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ ok: false, error: "bad_request" }, 415);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return json({ ok: false, error: "bad_request" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: bots fill every field. Pretend success, deliver nothing.
  if (typeof body === "object" && body && "company" in body && (body as { company?: string }).company) {
    return json({ ok: true });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) }, 422);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`enquiry:${ip}`, 5, 10 * 60_000)) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  // Duplicate submission (double click, retry after a slow network) — already handled.
  if (!rememberSubmission(parsed.data.submissionId)) {
    return json({ ok: true });
  }

  // 1. Save the lead in the database (the source of truth for the dashboard and WhatsApp automation).
  let saved: Awaited<ReturnType<typeof saveLeadFromEnquiry>> | null = null;
  if (db()) {
    try {
      saved = await saveLeadFromEnquiry(parsed.data, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
    } catch (e) {
      console.error("[enquiry] could not save lead:", e);
    }
  }
  // Same submission already stored by another server instance — nothing more to do.
  if (saved?.status === "duplicate") return json({ ok: true });

  // 2. Email / CRM webhook delivery, as before.
  const result = await deliverLead(parsed.data);

  // 3. After the visitor gets their response: start the permitted WhatsApp conversation.
  if (saved?.status === "saved") {
    const s = saved;
    after(async () => {
      try {
        if (s.canWhatsApp && isWhatsAppConfigured()) {
          const r = await startConversationFromEnquiry(s.lead, parsed.data);
          if (!r.sent) console.warn(`[enquiry] WhatsApp welcome not sent for lead ${s.lead.id}: ${r.reason}`);
        }
        // A site-visit request from the form is already a hot lead.
        if (s.lead.lead_category === "hot" && !s.lead.hot_notified_at) {
          await updateLead(s.lead.id, { hot_notified_at: new Date().toISOString() });
          await notifyTeam("hot_lead", s.lead);
        }
      } catch (e) {
        console.error("[enquiry] WhatsApp follow-through failed:", e);
      }
    });
  }

  // The enquiry counts as received if it reached the database or at least one delivery channel.
  if (saved?.status === "saved" || result === "ok") return json({ ok: true });

  // Allow the same submission to be retried after a failure.
  rememberSubmission(parsed.data.submissionId, true);
  if (result === "not_configured") return json({ ok: false, error: "not_configured" }, 503);
  return json({ ok: false, error: "delivery_failed" }, 502);
}
