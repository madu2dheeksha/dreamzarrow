import { after, type NextRequest } from "next/server";
import { whatsappConfig } from "@/lib/automation/config";
import { db } from "@/lib/automation/db";
import { handleBusinessEcho, handleInboundMessage } from "@/lib/automation/conversation";
import { handleStatus } from "@/lib/automation/statuses";
import { verifySignature, type WaWebhookPayload } from "@/lib/automation/whatsapp";

// Replies are generated after Meta gets its 200, inside after(); give them room.
export const maxDuration = 60;

/**
 * GET — Meta's one-time webhook verification handshake.
 * Meta calls ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… and expects the challenge back.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST — incoming messages and delivery receipts.
 * We verify Meta's signature, acknowledge immediately (Meta retries slow or failed
 * deliveries), and do the real work after the response is sent.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 1_000_000) return new Response("Too large", { status: 413 });

  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
      console.warn("[webhook] rejected: bad signature");
      return new Response("Invalid signature", { status: 401 });
    }
  } else if (process.env.WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS !== "true") {
    console.error("[webhook] META_APP_SECRET is not set — refusing unsigned webhook calls.");
    return new Response("Webhook not configured", { status: 503 });
  }

  let payload: WaWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (payload.object !== "whatsapp_business_account") return new Response("Ignored", { status: 200 });
  if (!db()) {
    console.error("[webhook] Supabase is not configured; cannot process WhatsApp events.");
    // 200 so Meta does not disable the webhook; nothing is lost from WhatsApp itself.
    return new Response("OK", { status: 200 });
  }

  const ourNumberId = whatsappConfig()?.phoneNumberId;
  const jobs: (() => Promise<unknown>)[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" && change.field !== "smb_message_echoes") continue;
      const v = change.value;
      if (ourNumberId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== ourNumberId) continue;
      for (const e of v.message_echoes ?? []) jobs.push(() => handleBusinessEcho(e));
      for (const s of v.statuses ?? []) jobs.push(() => handleStatus(s));
      for (const m of v.messages ?? []) {
        const name = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        jobs.push(() => handleInboundMessage(m, name));
      }
    }
  }

  after(async () => {
    const results = await Promise.allSettled(jobs.map((j) => j()));
    for (const r of results) if (r.status === "rejected") console.error("[webhook] processing failed:", r.reason);
  });
  return new Response("OK", { status: 200 });
}
