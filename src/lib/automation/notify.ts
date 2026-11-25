import "server-only";
import { site } from "@/content/site";
import { templateNames, whatsappConfig } from "./config";
import { db, type Lead, type Staff } from "./db";
import { formatPhone } from "./phone";
import { sendTemplate } from "./whatsapp";

/**
 * Internal alerts to the sales team (never to customers):
 *  - email via Resend (same credentials as the website enquiry emails),
 *  - WhatsApp template to each staff member who opted in (from the business number),
 *  - the lead is also highlighted in /admin.
 */

export type AlertKind = "hot_lead" | "handover";

const TIMELINE_LABEL: Record<string, string> = {
  immediate: "Ready now",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  exploring: "Just exploring",
};

export function alertFacts(lead: Lead) {
  return {
    name: lead.customer_name,
    phone: formatPhone(lead.phone_number),
    interest: [lead.enquiry_intent, lead.property_type, lead.configuration, lead.property_interest].filter(Boolean).join(" · ") || "—",
    budget: lead.budget ?? "—",
    location: lead.preferred_location ?? "—",
    timeline: lead.buying_timeline ? (TIMELINE_LABEL[lead.buying_timeline] ?? lead.buying_timeline) : "—",
    score: `${lead.lead_score}/100 (${lead.lead_category.toUpperCase()})`,
    summary: lead.ai_summary ?? lead.customer_requirements ?? "—",
    handover: lead.handover_reason ?? null,
    dashboard: `${site.url}/admin#lead=${lead.id}`,
    whatsapp: `https://wa.me/${lead.phone_number}`,
  };
}

async function recipients(lead: Lead): Promise<Staff[]> {
  const client = db();
  if (!client) return [];
  const { data } = await client.from("staff").select("*").eq("active", true);
  const staff = (data as Staff[]) ?? [];
  // If a salesperson is assigned, alert them plus the owners; otherwise alert everyone.
  if (lead.assigned_salesperson) return staff.filter((s) => s.id === lead.assigned_salesperson || s.role === "owner");
  return staff;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function emailAlert(kind: AlertKind, lead: Lead, staff: Staff[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  if (!apiKey || !from) return false;
  const to = Array.from(
    new Set([
      ...(process.env.ENQUIRY_TO_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      ...staff.filter((s) => s.notify_email).map((s) => s.email),
    ]),
  );
  if (!to.length) return false;
  const f = alertFacts(lead);
  const title = kind === "hot_lead" ? `🔥 Hot lead: ${f.name}` : `🙋 Customer wants a consultant: ${f.name}`;
  const rows: [string, string][] = [
    ["Customer", f.name],
    ["Phone", f.phone],
    ["Interest", f.interest],
    ["Budget", f.budget],
    ["Preferred location", f.location],
    ["Buying timeline", f.timeline],
    ["Lead score", f.score],
    ...(f.handover ? ([["Handover reason", f.handover]] as [string, string][]) : []),
    ["Conversation summary", f.summary],
  ];
  const html = `<h2 style="font-family:Arial,sans-serif">${escapeHtml(title)}</h2><table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#5f5d58;vertical-align:top"><strong>${escapeHtml(k)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join("")}</table><p style="font-family:Arial,sans-serif"><a href="${f.dashboard}">Open in dashboard</a> · <a href="${f.whatsapp}">Open WhatsApp chat</a></p>`;
  const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${kind}-${lead.id}-${new Date().toISOString().slice(0, 13)}` },
    body: JSON.stringify({ from, to, subject: title, html, text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nDashboard: ${f.dashboard}` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}

async function whatsappAlert(kind: AlertKind, lead: Lead, staff: Staff[]) {
  if (!whatsappConfig()) return 0;
  const f = alertFacts(lead);
  const targets = staff.filter((s) => s.notify_whatsapp && s.whatsapp_number);
  let sent = 0;
  for (const s of targets) {
    try {
      await sendTemplate(s.whatsapp_number!, templateNames.staffAlert, templateNames.language, [
        kind === "hot_lead" ? "HOT LEAD" : "HANDOVER REQUEST",
        `${f.name} (${f.phone})`,
        `${f.interest}; budget ${f.budget}; location ${f.location}; timeline ${f.timeline}`,
        f.score,
        (f.handover ? `${f.handover}. ` : "") + f.summary.slice(0, 600),
        f.dashboard,
      ]);
      sent++;
    } catch (e) {
      console.error(`[notify] WhatsApp alert to staff ${s.id} failed:`, (e as Error).message);
    }
  }
  return sent;
}

/** Sends every configured alert. Never throws — a failed alert must not break the customer conversation. */
export async function notifyTeam(kind: AlertKind, lead: Lead) {
  try {
    const staff = await recipients(lead);
    const [email, wa] = await Promise.allSettled([emailAlert(kind, lead, staff), whatsappAlert(kind, lead, staff)]);
    if (email.status === "rejected") console.error("[notify] email alert failed:", email.reason);
    if (wa.status === "rejected") console.error("[notify] WhatsApp alert failed:", wa.reason);
    console.info(`[notify] ${kind} for lead ${lead.id}: email=${email.status === "fulfilled" && email.value} whatsapp=${wa.status === "fulfilled" ? wa.value : 0}`);
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}
