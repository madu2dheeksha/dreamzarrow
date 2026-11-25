import "server-only";
import { SERVICE_WINDOW_MS } from "./config";
import type { Lead } from "./db";
import { recordMessage, updateLead } from "./leads";
import { sendButtons, sendImage, sendTemplate, sendText, WhatsAppError } from "./whatsapp";

export type Outgoing =
  | { kind: "text"; body: string; previewUrl?: boolean }
  | { kind: "template"; name: string; language: string; params: string[]; preview: string }
  | { kind: "image"; link: string; caption?: string }
  | { kind: "buttons"; body: string; buttons: { id: string; title: string }[] };

export type SendOutcome =
  | { ok: true; id: string }
  | { ok: false; reason: "opted_out" | "no_consent" | "outside_window" | "not_configured" | "failed"; error?: string };

export function inServiceWindow(lead: Pick<Lead, "last_inbound_at">, now = Date.now()) {
  return Boolean(lead.last_inbound_at && now - new Date(lead.last_inbound_at).getTime() < SERVICE_WINDOW_MS);
}

/**
 * Sends one message to a lead and records it in `conversations`.
 * Enforces the rules in one place: never message someone who opted out or never
 * consented, and only send free-form messages inside WhatsApp's 24-hour window.
 */
export async function sendToLead(
  lead: Lead,
  msg: Outgoing,
  sender: "ai" | "staff" | "system",
  opts: { staffId?: string; isFollowup?: boolean } = {},
): Promise<SendOutcome> {
  if (lead.opted_out) return { ok: false, reason: "opted_out" };
  // Replying inside an open conversation the customer started is always allowed;
  // starting one (templates) requires the opt-in recorded from the website form.
  const customerStarted = Boolean(lead.last_inbound_at);
  if (!lead.whatsapp_consent && !customerStarted) return { ok: false, reason: "no_consent" };
  if (msg.kind !== "template" && !inServiceWindow(lead)) return { ok: false, reason: "outside_window" };

  const to = lead.phone_number;
  const content =
    msg.kind === "text" ? msg.body : msg.kind === "template" ? msg.preview : msg.kind === "image" ? `[Photo] ${msg.caption ?? ""}`.trim() : msg.body;

  try {
    const { id } =
      msg.kind === "text"
        ? await sendText(to, msg.body, msg.previewUrl ?? true)
        : msg.kind === "template"
          ? await sendTemplate(to, msg.name, msg.language, msg.params)
          : msg.kind === "image"
            ? await sendImage(to, msg.link, msg.caption)
            : await sendButtons(to, msg.body, msg.buttons);

    await recordMessage({
      lead_id: lead.id,
      whatsapp_message_id: id,
      message_direction: "outbound",
      sender,
      message_content: content,
      message_type: msg.kind === "buttons" ? "interactive" : msg.kind,
      template_name: msg.kind === "template" ? msg.name : null,
      staff_id: opts.staffId ?? null,
      delivery_status: "sent",
    });
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { last_outbound_at: now };
    // Start the "customer is quiet" clock on our first message after their last reply.
    if (!opts.isFollowup && !lead.silence_started_at) patch.silence_started_at = now;
    await updateLead(lead.id, patch).catch((e) => console.error("[messaging] lead update failed:", e));
    lead.last_outbound_at = now;
    if (patch.silence_started_at) lead.silence_started_at = now;
    return { ok: true, id };
  } catch (err) {
    const e = err as Error;
    if (e.message === "WhatsApp is not configured") return { ok: false, reason: "not_configured" };
    const wa = err instanceof WhatsAppError ? err : null;
    console.error("[messaging] send failed:", wa?.code, e.message, wa?.details ?? "");
    await recordMessage({
      lead_id: lead.id,
      whatsapp_message_id: null,
      message_direction: "outbound",
      sender,
      message_content: content,
      message_type: msg.kind === "buttons" ? "interactive" : msg.kind,
      template_name: msg.kind === "template" ? msg.name : null,
      staff_id: opts.staffId ?? null,
      delivery_status: "failed",
      error: `${wa?.code ?? ""} ${e.message}`.trim().slice(0, 500),
    });
    if (wa?.outsideServiceWindow) return { ok: false, reason: "outside_window", error: e.message };
    return { ok: false, reason: "failed", error: e.message };
  }
}

const OPT_OUT = [
  "stop messages",
  "stop messaging",
  "unsubscribe",
  "opt out",
  "optout",
  "don't message",
  "dont message",
  "do not message",
  "do not contact",
  "don't contact",
  "dont contact",
  "remove me",
  "no more messages",
  "band karo", // Hindi: stop it
  "message mat karo",
  "aapandi", // Telugu (romanised): stop
  "pampakandi", // Telugu (romanised): don't send
  "ఆపండి",
  "బంద్",
  "बंद करो",
  "मैसेज मत करो",
];

/** True for clear opt-out requests. Ambiguous text is left to the AI, which can also record an opt-out. */
export function isOptOutMessage(text: string) {
  const t = text.trim().toLowerCase().replace(/[.!]+$/, "");
  if (!t) return false;
  if (t === "stop" || t === "unsubscribe" || t === "stop messages") return true;
  return t.length <= 60 && OPT_OUT.some((k) => t.includes(k));
}

export function isOptInMessage(text: string) {
  const t = text.trim().toLowerCase();
  return t === "start" || t === "subscribe" || t === "resume";
}
