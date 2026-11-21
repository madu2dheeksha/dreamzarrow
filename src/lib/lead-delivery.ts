import "server-only";
import type { Enquiry } from "./enquiry-schema";
import { enquiryIntents } from "@/content/services";
import { site } from "@/content/site";

/**
 * Leads are delivered to every configured channel:
 *  - Email via Resend (RESEND_API_KEY + ENQUIRY_TO_EMAIL + ENQUIRY_FROM_EMAIL)
 *  - Any CRM / automation tool via a JSON webhook (LEAD_WEBHOOK_URL)
 * If neither is configured the API reports `not_configured` so the UI can
 * offer WhatsApp / phone instead — it never pretends a lead was received.
 */

export function deliveryChannels() {
  const email =
    process.env.RESEND_API_KEY && process.env.ENQUIRY_TO_EMAIL && process.env.ENQUIRY_FROM_EMAIL
      ? {
          apiKey: process.env.RESEND_API_KEY,
          to: process.env.ENQUIRY_TO_EMAIL.split(",").map((s) => s.trim()).filter(Boolean),
          from: process.env.ENQUIRY_FROM_EMAIL,
        }
      : null;
  const webhook = process.env.LEAD_WEBHOOK_URL
    ? { url: process.env.LEAD_WEBHOOK_URL, secret: process.env.LEAD_WEBHOOK_SECRET }
    : null;
  return { email, webhook };
}

const intentLabel = (v: string) => enquiryIntents.find((i) => i.value === v)?.label ?? v;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function rows(e: Enquiry) {
  return [
    ["Name", e.name],
    ["Phone", e.phone],
    ["Email", e.email ?? "—"],
    ["Looking to", intentLabel(e.intent)],
    ["Property", e.property ?? "—"],
    ["Preferred visit date", e.preferredDate ?? "—"],
    ["Message", e.message || "—"],
    ["Submitted from", e.page ?? "—"],
  ] as const;
}

async function sendEmail(e: Enquiry, cfg: NonNullable<ReturnType<typeof deliveryChannels>["email"]>) {
  const subject = `New enquiry: ${intentLabel(e.intent)} — ${e.name}${e.property ? ` (${e.property})` : ""}`;
  const text = rows(e)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const html = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows(e)
    .map(
      ([k, v]) =>
        `<tr><td style="color:#5f5d58;vertical-align:top;white-space:nowrap"><strong>${escapeHtml(k)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(String(v))}</td></tr>`,
    )
    .join("")}</table><p style="font-family:Arial,sans-serif;font-size:12px;color:#888">Sent from the ${escapeHtml(site.name)} website.</p>`;

  const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": e.submissionId,
    },
    body: JSON.stringify({
      from: cfg.from,
      to: cfg.to,
      reply_to: e.email,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendWebhook(e: Enquiry, cfg: NonNullable<ReturnType<typeof deliveryChannels>["webhook"]>) {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.secret ? { Authorization: `Bearer ${cfg.secret}` } : {}),
    },
    body: JSON.stringify({
      source: "website",
      submittedAt: new Date().toISOString(),
      id: e.submissionId,
      name: e.name,
      phone: e.phone,
      email: e.email ?? null,
      intent: e.intent,
      intentLabel: intentLabel(e.intent),
      property: e.property ?? null,
      preferredDate: e.preferredDate ?? null,
      message: e.message || null,
      page: e.page ?? null,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

export async function deliverLead(e: Enquiry): Promise<"ok" | "not_configured" | "failed"> {
  const { email, webhook } = deliveryChannels();
  const jobs: Promise<void>[] = [];
  if (email) jobs.push(sendEmail(e, email));
  if (webhook) jobs.push(sendWebhook(e, webhook));
  if (jobs.length === 0) return "not_configured";

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") console.error("[enquiry] delivery channel failed:", r.reason);
  });
  // Succeed if at least one channel accepted the lead.
  return results.some((r) => r.status === "fulfilled") ? "ok" : "failed";
}
