import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

let client: SupabaseClient | null | undefined;

/**
 * Service-role Supabase client. Server-only: this key bypasses Row Level Security,
 * so it must never reach the browser. Returns null when Supabase is not configured.
 */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = supabaseConfig();
  client = cfg
    ? createClient(cfg.url, cfg.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      })
    : null;
  return client;
}

/** Same as db() but throws — for code paths that cannot work without the database. */
export function requireDb(): SupabaseClient {
  const c = db();
  if (!c) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return c;
}

/** Used by tests to inject a fake client. */
export function __setDbForTests(c: SupabaseClient | null | undefined) {
  client = c;
}

export type Lead = {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string | null;
  enquiry_source: string;
  enquiry_intent: string | null;
  property_interest: string | null;
  property_type: string | null;
  budget: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  configuration: string | null;
  furnishing: string | null;
  possession: string | null;
  buying_timeline: string | null;
  customer_requirements: string | null;
  preferred_callback_time: string | null;
  language: string | null;
  lead_status: string;
  lead_category: "new" | "hot" | "warm" | "cold";
  lead_score: number;
  score_signals: Record<string, boolean>;
  ai_summary: string | null;
  ai_summary_at: string | null;
  assigned_salesperson: string | null;
  human_handover: boolean;
  handover_reason: string | null;
  handover_at: string | null;
  hot_notified_at: string | null;
  whatsapp_consent: boolean;
  consent_at: string | null;
  opted_out: boolean;
  opted_out_at: string | null;
  welcome_sent_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  followup_stage: number;
  silence_started_at: string | null;
  enquiry_count: number;
  created_at: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  lead_id: string;
  whatsapp_message_id: string | null;
  message_direction: "inbound" | "outbound";
  sender: "customer" | "ai" | "staff" | "system";
  message_content: string | null;
  message_type: string;
  template_name: string | null;
  staff_id: string | null;
  delivery_status: "pending" | "sent" | "delivered" | "read" | "failed" | "received";
  error: string | null;
  timestamp: string;
};

export type Staff = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "sales";
  whatsapp_number: string | null;
  notify_whatsapp: boolean;
  notify_email: boolean;
  active: boolean;
};
