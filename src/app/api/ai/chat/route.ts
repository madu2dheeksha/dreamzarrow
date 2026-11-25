import { z } from "zod";
import { readJson, requireStaff } from "@/lib/automation/admin-auth";
import { openaiConfig } from "@/lib/automation/config";
import type { ConversationRow, Lead } from "@/lib/automation/db";
import { runAssistant, type AgentEffects } from "@/lib/automation/ai/agent";
import { scoreLead, type ScoreSignals, type Timeline } from "@/lib/automation/scoring";

export const maxDuration = 60;

/**
 * AI playground (staff only). Runs the real assistant, prompt, tools and listing
 * search against a conversation you type in the dashboard — but in dry-run mode:
 * nothing is sent on WhatsApp and nothing is written to the database.
 * Use it to test behaviour before (and after) going live.
 */
export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  if (!openaiConfig()) return Response.json({ error: "ai_not_configured" }, { status: 503 });

  const parsed = z
    .object({
      messages: z.array(z.object({ from: z.enum(["customer", "assistant"]), text: z.string().max(2000) })).min(1).max(40),
      profile: z.record(z.string(), z.unknown()).optional(),
      signals: z.record(z.string(), z.boolean()).optional(),
    })
    .safeParse(await readJson(request, 100_000).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });

  const now = new Date().toISOString();
  let lead: Lead = {
    id: "00000000-0000-0000-0000-000000000000",
    customer_name: "Test Customer",
    phone_number: "910000000000",
    email: null,
    enquiry_source: "playground",
    enquiry_intent: null,
    property_interest: null,
    property_type: null,
    budget: null,
    budget_min: null,
    budget_max: null,
    preferred_location: null,
    configuration: null,
    furnishing: null,
    possession: null,
    buying_timeline: null,
    customer_requirements: null,
    preferred_callback_time: null,
    language: null,
    lead_status: "contacted",
    lead_category: "new",
    lead_score: 0,
    score_signals: parsed.data.signals ?? {},
    ai_summary: null,
    ai_summary_at: null,
    assigned_salesperson: null,
    human_handover: false,
    handover_reason: null,
    handover_at: null,
    hot_notified_at: null,
    whatsapp_consent: true,
    consent_at: now,
    opted_out: false,
    opted_out_at: null,
    welcome_sent_at: now,
    last_inbound_at: now,
    last_outbound_at: now,
    followup_stage: 0,
    silence_started_at: null,
    enquiry_count: 1,
    created_at: now,
    updated_at: now,
    ...(parsed.data.profile as Partial<Lead>),
  };

  const shared: string[] = [];
  const events: string[] = [];
  const effects: AgentEffects = {
    async updateProfile(patch, signals: ScoreSignals) {
      const { requirements_note, ...cols } = patch;
      const merged = { ...lead.score_signals, ...Object.fromEntries(Object.entries(signals).filter(([, v]) => v !== undefined)) };
      lead = { ...lead, ...cols, score_signals: merged, customer_requirements: requirements_note ? [lead.customer_requirements, requirements_note].filter(Boolean).join("\n") : lead.customer_requirements } as Lead;
    },
    async shareProperty(_slug, caption) {
      shared.push(caption);
      return true;
    },
    async handover(category, details, time) {
      events.push(`HANDOVER → ${category}: ${details}${time ? ` (${time})` : ""}`);
      lead.score_signals = { ...lead.score_signals, site_visit_requested: category === "site_visit" || lead.score_signals.site_visit_requested, callback_requested: category === "callback" || lead.score_signals.callback_requested };
      lead.human_handover = true;
    },
    async optOut() {
      events.push("OPT-OUT recorded");
    },
  };

  const history: ConversationRow[] = parsed.data.messages.map((m, i) => ({
    id: String(i),
    lead_id: lead.id,
    whatsapp_message_id: null,
    message_direction: m.from === "customer" ? "inbound" : "outbound",
    sender: m.from === "customer" ? "customer" : "ai",
    message_content: m.text,
    message_type: "text",
    template_name: null,
    staff_id: null,
    delivery_status: m.from === "customer" ? "received" : "sent",
    error: null,
    timestamp: now,
  }));

  try {
    const result = await runAssistant(lead, history, effects);
    const { score, category } = scoreLead({ ...lead.score_signals, engaged: true }, lead.buying_timeline as Timeline);
    return Response.json({ reply: result.reply, actions: result.actions, shared, events, profile: lead, score, category });
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
