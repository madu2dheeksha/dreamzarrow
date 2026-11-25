"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client used ONLY for staff sign-in. It uses the public
 * anon key; all tables have RLS with no policies, so this key cannot read data.
 * Data is fetched from /api/admin/* with the signed-in user's access token.
 */
let client: SupabaseClient | null = null;

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "dza-admin-auth" } });
  return client;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const sb = supabaseBrowser();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(rest.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const isJson = res.headers.get("content-type")?.includes("json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const msg = (body as { message?: string; error?: string } | null)?.message ?? (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  return body as T;
}

export async function downloadCsv(path: string) {
  const sb = supabaseBrowser();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "leads.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Shared types (mirror the database) ───────────────────────────────────

export type StaffMember = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "sales";
  whatsapp_number: string | null;
  notify_whatsapp: boolean;
  notify_email: boolean;
  active: boolean;
};

export type LeadRow = {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string | null;
  enquiry_source: string;
  enquiry_intent: string | null;
  property_interest: string | null;
  property_type: string | null;
  budget: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_location: string | null;
  configuration: string | null;
  furnishing?: string | null;
  possession?: string | null;
  buying_timeline: string | null;
  customer_requirements?: string | null;
  preferred_callback_time?: string | null;
  language?: string | null;
  lead_status: string;
  lead_category: "new" | "hot" | "warm" | "cold";
  lead_score: number;
  score_signals?: Record<string, boolean>;
  ai_summary?: string | null;
  ai_summary_at?: string | null;
  assigned_salesperson: string | null;
  human_handover: boolean;
  handover_reason?: string | null;
  opted_out: boolean;
  whatsapp_consent: boolean;
  consent_at?: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  message_direction: "inbound" | "outbound";
  sender: "customer" | "ai" | "staff" | "system";
  message_content: string | null;
  message_type: string;
  template_name: string | null;
  delivery_status: string;
  error: string | null;
  timestamp: string;
  staff_id: string | null;
};

export type Followup = {
  id: string;
  lead_id: string;
  followup_date: string;
  followup_type: string;
  followup_status: string;
  notes: string | null;
  created_by: string | null;
  leads?: { id: string; customer_name: string; phone_number: string; lead_category: string; assigned_salesperson: string | null };
};

export type Note = { id: string; note: string; author_id: string | null; created_at: string };

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_visit_requested: "Site visit requested",
  site_visit_scheduled: "Site visit scheduled",
  negotiation: "Negotiation",
  converted: "Converted",
  lost: "Lost",
  opted_out: "Opted out",
  human_handover: "Human handover",
};

export const TIMELINE_LABEL: Record<string, string> = {
  immediate: "Ready now",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  exploring: "Exploring",
};

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtPhone = (p: string) => (/^91\d{10}$/.test(p) ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
