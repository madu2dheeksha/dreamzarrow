import "server-only";

/**
 * Central place that reads automation settings from environment variables.
 * Every feature checks its own config and degrades gracefully when it is missing:
 * the website keeps working, and nothing pretends a message was sent.
 */

export const whatsappConfig = () => {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID ?? null,
    appSecret: process.env.META_APP_SECRET ?? null,
    graphVersion: process.env.META_GRAPH_API_VERSION ?? "v24.0",
    graphBase: (process.env.META_GRAPH_API_URL ?? "https://graph.facebook.com").replace(/\/$/, ""),
  };
};

export const openaiConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  };
};

export const supabaseConfig = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
};

/** Names of the message templates you create in WhatsApp Manager (see docs/WHATSAPP-AUTOMATION.md). */
export const templateNames = {
  welcome: process.env.WA_TEMPLATE_WELCOME ?? "dza_enquiry_welcome",
  followup1: process.env.WA_TEMPLATE_FOLLOWUP_1 ?? "dza_followup_1",
  followup2: process.env.WA_TEMPLATE_FOLLOWUP_2 ?? "dza_followup_2",
  followup3: process.env.WA_TEMPLATE_FOLLOWUP_3 ?? "dza_followup_3",
  staffAlert: process.env.WA_TEMPLATE_STAFF_ALERT ?? "dza_staff_lead_alert",
  language: process.env.WA_TEMPLATE_LANGUAGE ?? "en",
};

/** Secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`. */
export const cronSecret = () => process.env.CRON_SECRET ?? null;

/** Master switch so the AI can be turned off without a redeploy (staff then answer manually). */
export const aiEnabled = () => process.env.AI_ASSISTANT_ENABLED !== "false";

/** Automatic follow-up schedule, in hours after the customer went quiet. */
export const FOLLOWUP_DELAYS_HOURS = [24, 72, 168] as const;

/** WhatsApp only allows free-form messages within 24h of the customer's last message. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
