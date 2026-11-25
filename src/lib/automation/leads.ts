import "server-only";
import type { Enquiry } from "@/lib/enquiry-schema";
import { requireDb, type ConversationRow, type Lead } from "./db";
import { normalizePhone } from "./phone";
import { scoreLead, type ScoreSignals, type Timeline } from "./scoring";

export const CONSENT_TEXT =
  "I agree to be contacted by DreaamzArrow Homes on WhatsApp about my enquiry. I can reply STOP at any time.";

export type SaveLeadResult =
  | { status: "duplicate" }
  | { status: "saved"; lead: Lead; isNew: boolean; canWhatsApp: boolean };

/**
 * Creates or updates the lead for a website enquiry. One lead per phone number:
 * repeat enquiries update the same record (and are kept in lead_enquiries).
 * Idempotent per submissionId, so retries and double clicks never duplicate anything.
 */
export async function saveLeadFromEnquiry(
  e: Enquiry & { whatsappConsent?: boolean },
  meta: { ip?: string; userAgent?: string } = {},
): Promise<SaveLeadResult> {
  const sb = requireDb();

  const { data: seen } = await sb.from("lead_enquiries").select("id").eq("submission_id", e.submissionId).maybeSingle();
  if (seen) return { status: "duplicate" };

  const waId = normalizePhone(e.phone);
  const phone = waId ?? e.phone.replace(/\D/g, "");
  const now = new Date().toISOString();
  const consent = Boolean(e.whatsappConsent) && Boolean(waId);

  const { data: existing, error: findErr } = await sb.from("leads").select("*").eq("phone_number", phone).maybeSingle();
  if (findErr) throw new Error(`lead lookup failed: ${findErr.message}`);

  const intentSignals: ScoreSignals = {
    has_requirement: Boolean(e.property) || undefined,
    requested_details: Boolean(e.property) || undefined,
    site_visit_requested: e.intent === "site-visit" || undefined,
  };

  let lead: Lead;
  let isNew = false;
  if (existing) {
    const prev = existing as Lead;
    const signals = { ...prev.score_signals, ...stripUndefined(intentSignals) };
    const { score, category } = scoreLead(signals, prev.buying_timeline as Timeline);
    const patch: Partial<Lead> & Record<string, unknown> = {
      customer_name: e.name,
      email: e.email ?? prev.email,
      enquiry_intent: e.intent,
      property_interest: e.property ?? prev.property_interest,
      enquiry_count: prev.enquiry_count + 1,
      score_signals: signals,
      lead_score: score,
      lead_category: category,
      // A new enquiry re-opens a closed/lost lead, but never undoes a sale.
      lead_status: prev.lead_status === "lost" ? "new" : prev.lead_status,
    };
    if (e.message) patch.customer_requirements = [prev.customer_requirements, e.message].filter(Boolean).join("\n---\n").slice(-4000);
    if (consent) {
      // Fresh, explicit opt-in from the form re-subscribes someone who opted out earlier.
      Object.assign(patch, {
        whatsapp_consent: true,
        consent_at: now,
        consent_text: CONSENT_TEXT,
        consent_source: `website:${e.page ?? "form"}`,
        opted_out: false,
        opted_out_at: null,
        lead_status: prev.lead_status === "opted_out" ? "new" : patch.lead_status,
      });
    }
    const { data, error } = await sb.from("leads").update(patch).eq("id", prev.id).select("*").single();
    if (error) throw new Error(`lead update failed: ${error.message}`);
    lead = data as Lead;
  } else {
    const signals = stripUndefined(intentSignals);
    const { score, category } = scoreLead(signals, null);
    const { data, error } = await sb
      .from("leads")
      .insert({
        customer_name: e.name,
        phone_number: phone,
        email: e.email ?? null,
        enquiry_source: "website",
        enquiry_intent: e.intent,
        property_interest: e.property ?? null,
        property_type: e.intent === "invest" ? "investment" : e.intent === "rent" ? "rental" : null,
        customer_requirements: e.message || null,
        score_signals: signals,
        lead_score: score,
        lead_category: category,
        lead_status: e.intent === "site-visit" ? "site_visit_requested" : "new",
        whatsapp_consent: consent,
        consent_at: consent ? now : null,
        consent_text: consent ? CONSENT_TEXT : null,
        consent_source: consent ? `website:${e.page ?? "form"}` : null,
      })
      .select("*")
      .single();
    if (error) {
      // Two simultaneous first enquiries from the same number: retry as an update.
      if (error.code === "23505") return saveLeadFromEnquiry(e, meta);
      throw new Error(`lead insert failed: ${error.message}`);
    }
    lead = data as Lead;
    isNew = true;
  }

  const { error: enqErr } = await sb.from("lead_enquiries").insert({
    lead_id: lead.id,
    submission_id: e.submissionId,
    intent: e.intent,
    property: e.property ?? null,
    preferred_date: e.preferredDate ?? null,
    message: e.message || null,
    page: e.page ?? null,
    whatsapp_consent: consent,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent?.slice(0, 300) ?? null,
  });
  if (enqErr?.code === "23505") return { status: "duplicate" };
  if (enqErr) console.error("[leads] could not store enquiry history:", enqErr.message);

  return { status: "saved", lead, isNew, canWhatsApp: Boolean(waId) && lead.whatsapp_consent && !lead.opted_out };
}

function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data } = await requireDb().from("leads").select("*").eq("id", id).maybeSingle();
  return (data as Lead) ?? null;
}

export async function getLeadByPhone(waId: string): Promise<Lead | null> {
  const { data } = await requireDb().from("leads").select("*").eq("phone_number", waId).maybeSingle();
  return (data as Lead) ?? null;
}

export async function updateLead(id: string, patch: Record<string, unknown>): Promise<Lead> {
  const { data, error } = await requireDb().from("leads").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(`lead update failed: ${error.message}`);
  return data as Lead;
}

/** Merges new signals, recomputes score/category and saves. Reports whether the lead just became hot. */
export async function rescoreLead(lead: Lead, newSignals: ScoreSignals = {}, extra: Record<string, unknown> = {}) {
  const signals = { ...lead.score_signals, ...stripUndefined(newSignals as Record<string, unknown>) } as ScoreSignals;
  const timeline = (extra.buying_timeline ?? lead.buying_timeline) as Timeline;
  const { score, category } = scoreLead(signals, timeline);
  const updated = await updateLead(lead.id, { ...extra, score_signals: signals, lead_score: score, lead_category: category });
  return { lead: updated, becameHot: category === "hot" && !lead.hot_notified_at };
}

export async function recordMessage(row: Omit<ConversationRow, "id" | "timestamp" | "error" | "template_name" | "staff_id"> & Partial<Pick<ConversationRow, "timestamp" | "error" | "template_name" | "staff_id">>) {
  const { error } = await requireDb().from("conversations").insert(row);
  if (error && error.code !== "23505") console.error("[leads] could not record message:", error.message);
}

export async function recentMessages(leadId: string, limit = 30): Promise<ConversationRow[]> {
  const { data } = await requireDb()
    .from("conversations")
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  return ((data as ConversationRow[]) ?? []).reverse();
}

/**
 * Remembers a webhook event id. Returns false if we have already processed it
 * (Meta retries deliveries, sometimes several times).
 */
export async function claimWebhookEvent(id: string): Promise<boolean> {
  const { error } = await requireDb().from("webhook_events").insert({ id });
  if (!error) return true;
  if (error.code === "23505") return false;
  // If the dedupe table is unavailable, process anyway — message ids are unique in `conversations` too.
  console.error("[webhook] dedupe insert failed:", error.message);
  return true;
}
