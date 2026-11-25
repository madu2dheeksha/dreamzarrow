import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { whatsappConfig } from "./config";

/**
 * Thin client for the official WhatsApp Business Cloud API (Meta Graph API).
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly details?: string,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
  /** 131047: more than 24h since the customer last messaged — only a template can be sent. */
  get outsideServiceWindow() {
    return this.code === 131047;
  }
  /** 131050: the customer has stopped marketing messages from this business. */
  get userStoppedMarketing() {
    return this.code === 131050;
  }
  /** Rate limits and transient server errors are worth retrying. */
  get retryable() {
    return this.status >= 500 || this.status === 429 || this.code === 130429 || this.code === 131048 || this.code === 4;
  }
}

export function isWhatsAppConfigured() {
  return whatsappConfig() !== null;
}

async function graphPost(body: Record<string, unknown>, attempt = 1): Promise<{ id: string }> {
  const cfg = whatsappConfig();
  if (!cfg) throw new WhatsAppError("WhatsApp is not configured", 503);
  const res = await fetch(`${cfg.graphBase}/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string; code?: number; error_data?: { details?: string } };
  };
  if (!res.ok || !data.messages?.[0]?.id) {
    const err = new WhatsAppError(
      data.error?.message ?? `WhatsApp API responded ${res.status}`,
      res.status,
      data.error?.code,
      data.error?.error_data?.details,
    );
    if (err.retryable && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return graphPost(body, attempt + 1);
    }
    throw err;
  }
  return { id: data.messages[0].id };
}

/** WhatsApp caps text bodies at 4096 characters. */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function sendText(to: string, body: string, previewUrl = true) {
  return graphPost({ recipient_type: "individual", to, type: "text", text: { body: clip(body, 4096), preview_url: previewUrl } });
}

export function sendTemplate(to: string, name: string, language: string, bodyParams: string[] = []) {
  return graphPost({
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(bodyParams.length
        ? {
            components: [
              {
                type: "body",
                // Template variables may not contain newlines/tabs or 4+ consecutive spaces.
                parameters: bodyParams.map((t) => ({ type: "text", text: clip(t.replace(/\s+/g, " ").trim() || "-", 1000) })),
              },
            ],
          }
        : {}),
    },
  });
}

export function sendImage(to: string, link: string, caption?: string) {
  return graphPost({ to, type: "image", image: { link, ...(caption ? { caption: clip(caption, 1024) } : {}) } });
}

export function sendDocument(to: string, link: string, filename: string, caption?: string) {
  return graphPost({ to, type: "document", document: { link, filename, ...(caption ? { caption: clip(caption, 1024) } : {}) } });
}

/** Up to 3 quick-reply buttons (titles max 20 characters). */
export function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  return graphPost({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: clip(body, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: clip(b.title, 20) } })),
      },
    },
  });
}

/** Marks a received message as read (blue ticks). Best effort. */
export async function markRead(messageId: string) {
  const cfg = whatsappConfig();
  if (!cfg) return;
  await fetch(`${cfg.graphBase}/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
}

/**
 * Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the App Secret).
 * Must be computed over the exact raw bytes received.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let given: Buffer;
  try {
    given = Buffer.from(header.slice(7), "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// ── Webhook payload types (subset we use) ─────────────────────────────────

export type WaInboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  image?: { caption?: string; mime_type?: string; id?: string };
  document?: { caption?: string; filename?: string };
  video?: { caption?: string };
  audio?: unknown;
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: unknown[];
  context?: { id?: string };
  referral?: { source_url?: string; headline?: string };
};

export type WaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed" | "deleted";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title?: string; message?: string; error_data?: { details?: string } }[];
};

export type WaWebhookPayload = {
  object?: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: WaInboundMessage[];
        statuses?: WaStatus[];
        /** Coexistence: messages the business sent from the WhatsApp Business app on the phone. */
        message_echoes?: (Omit<WaInboundMessage, "from"> & { from: string; to: string })[];
      };
    }[];
  }[];
};

/** Turns any inbound message type into readable text for the AI and the dashboard. */
export function describeInbound(m: WaInboundMessage): { text: string; kind: string } {
  switch (m.type) {
    case "text":
      return { text: m.text?.body ?? "", kind: "text" };
    case "button":
      return { text: m.button?.text ?? m.button?.payload ?? "", kind: "button" };
    case "interactive": {
      const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
      return { text: r?.title ?? "", kind: "interactive" };
    }
    case "image":
      return { text: `[Customer sent a photo]${m.image?.caption ? ` ${m.image.caption}` : ""}`, kind: "image" };
    case "document":
      return { text: `[Customer sent a document${m.document?.filename ? `: ${m.document.filename}` : ""}]${m.document?.caption ? ` ${m.document.caption}` : ""}`, kind: "document" };
    case "video":
      return { text: `[Customer sent a video]${m.video?.caption ? ` ${m.video.caption}` : ""}`, kind: "video" };
    case "audio":
      return { text: "[Customer sent a voice note]", kind: "audio" };
    case "location":
      return {
        text: `[Customer shared a location: ${[m.location?.name, m.location?.address].filter(Boolean).join(", ") || `${m.location?.latitude}, ${m.location?.longitude}`}]`,
        kind: "location",
      };
    case "contacts":
      return { text: "[Customer shared a contact card]", kind: "contacts" };
    case "sticker":
    case "reaction":
      return { text: "", kind: m.type };
    default:
      return { text: `[Unsupported message type: ${m.type}]`, kind: m.type };
  }
}
