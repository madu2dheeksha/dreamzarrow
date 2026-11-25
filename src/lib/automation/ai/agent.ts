import "server-only";
import { z } from "zod";
import { formatPrice } from "@/lib/property-utils";
import type { ConversationRow, Lead } from "../db";
import { getListing, inventoryOverview, listingDetails, searchProperties, propertyUrl } from "../inventory";
import type { ScoreSignals } from "../scoring";
import { chatCompletion, type ChatMessage, type ToolDef } from "./openai";
import { CORE_SYSTEM_PROMPT, operatingRules, SUMMARY_PROMPT } from "./prompt";

/**
 * The assistant only acts through these narrowly-scoped effects, all bound to the
 * ONE lead being served. It has no way to query other leads or run arbitrary SQL.
 */
export type AgentEffects = {
  updateProfile(patch: ProfileUpdate, signals: ScoreSignals): Promise<void>;
  shareProperty(slug: string, caption: string): Promise<boolean>;
  handover(category: HandoverCategory, details: string, preferredTime?: string): Promise<void>;
  optOut(): Promise<void>;
};

export type HandoverCategory =
  | "site_visit"
  | "callback"
  | "ready_to_buy"
  | "negotiation"
  | "legal_financial"
  | "cannot_answer"
  | "asked_for_human";

export const profileSchema = z
  .object({
    customer_name: z.string().min(2).max(80),
    email: z.email().max(120),
    enquiry_intent: z.enum(["buy", "rent", "invest", "commercial", "list"]),
    property_type: z.enum(["apartment", "independent_house", "villa", "plot", "commercial", "rental", "investment"]),
    budget: z.string().max(80),
    budget_min: z.number().nonnegative().max(1e11),
    budget_max: z.number().nonnegative().max(1e11),
    preferred_location: z.string().max(200),
    configuration: z.string().max(60),
    furnishing: z.enum(["furnished", "semi_furnished", "unfurnished", "any"]),
    possession: z.enum(["ready_to_move", "under_construction", "any"]),
    buying_timeline: z.enum(["immediate", "1_3_months", "3_6_months", "exploring"]),
    preferred_callback_time: z.string().max(120),
    language: z.enum(["en", "te", "hi"]),
    requirements_note: z.string().max(500),
  })
  .partial();
export type ProfileUpdate = z.infer<typeof profileSchema>;

const searchSchema = z.object({
  listing: z.enum(["sale", "rent", "any"]).optional(),
  property_type: z.enum(["apartment", "villa", "any"]).optional(),
  bhk: z.array(z.number().int().min(1).max(10)).max(5).optional(),
  localities: z.array(z.string().max(60)).max(8).optional(),
  min_budget: z.number().nonnegative().optional(),
  max_budget: z.number().nonnegative().optional(),
  furnishing: z.string().max(40).optional(),
});

const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_properties",
      description:
        "Search DreaamzArrow Homes' CURRENT listings. The only source of truth for what we have. Prices are INR: sale price, or monthly rent for rentals. Returns at most 5.",
      parameters: {
        type: "object",
        properties: {
          listing: { type: "string", enum: ["sale", "rent", "any"] },
          property_type: { type: "string", enum: ["apartment", "villa", "any"], description: "We currently list apartments and villas only." },
          bhk: { type: "array", items: { type: "integer" } },
          localities: { type: "array", items: { type: "string" }, description: "Hyderabad areas, e.g. Kokapet, Kondapur" },
          min_budget: { type: "number", description: "INR. Rent: per month." },
          max_budget: { type: "number", description: "INR. Rent: per month. 1 crore = 10000000, 1 lakh = 100000." },
          furnishing: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_property_details",
      description: "Full details (features, amenities, nearby places, description) of one listing returned by search_properties.",
      parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "share_property",
      description: "Send the customer a photo of a listing with its title, price and web link. Use for up to 3 relevant matches.",
      parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "update_customer_profile",
      description:
        "Save facts the customer stated. Include only fields you learned. budget = their words (e.g. '1.2-1.5 Cr', '60k/month'); budget_min/max in INR. Also flag requests.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          email: { type: "string" },
          enquiry_intent: { type: "string", enum: ["buy", "rent", "invest", "commercial", "list"] },
          property_type: { type: "string", enum: ["apartment", "independent_house", "villa", "plot", "commercial", "rental", "investment"] },
          budget: { type: "string" },
          budget_min: { type: "number" },
          budget_max: { type: "number" },
          preferred_location: { type: "string" },
          configuration: { type: "string", description: "e.g. '3 BHK'" },
          furnishing: { type: "string", enum: ["furnished", "semi_furnished", "unfurnished", "any"] },
          possession: { type: "string", enum: ["ready_to_move", "under_construction", "any"] },
          buying_timeline: { type: "string", enum: ["immediate", "1_3_months", "3_6_months", "exploring"] },
          preferred_callback_time: { type: "string" },
          language: { type: "string", enum: ["en", "te", "hi"] },
          requirements_note: { type: "string", description: "Other requirements in a few words (e.g. 'needs pet-friendly, east facing')." },
          requested_property_details: { type: "boolean", description: "Customer asked for details/photos/prices of specific listings." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_human_handover",
      description:
        "Transfer to a human consultant: site visit, call request, ready to buy/rent, negotiation/discount, legal/financial/loan questions, asks for a person, or you cannot answer confidently.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["site_visit", "callback", "ready_to_buy", "negotiation", "legal_financial", "cannot_answer", "asked_for_human"] },
          details: { type: "string", description: "One line for the consultant: what exactly the customer wants (listing, date, question)." },
          preferred_time: { type: "string" },
        },
        required: ["category", "details"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_opt_out",
      description: "Customer asked not to be messaged any more / unsubscribed.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

/** Known facts given to the model so it never re-asks. Excludes internal fields. */
export function profileForPrompt(lead: Lead) {
  const pick = {
    name: lead.customer_name,
    email: lead.email,
    enquired_about_listing: lead.property_interest,
    intent: lead.enquiry_intent,
    property_type: lead.property_type,
    budget: lead.budget,
    preferred_location: lead.preferred_location,
    configuration: lead.configuration,
    furnishing: lead.furnishing,
    possession: lead.possession,
    timeline: lead.buying_timeline,
    callback_time: lead.preferred_callback_time,
    language: lead.language,
    notes_from_form_and_chat: lead.customer_requirements?.slice(-800) ?? null,
  };
  return Object.fromEntries(Object.entries(pick).filter(([, v]) => v != null && v !== ""));
}

export function historyToMessages(history: ConversationRow[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of history) {
    const text = (m.message_content ?? "").trim();
    if (!text) continue;
    if (m.message_direction === "inbound") out.push({ role: "user", content: text.slice(0, 2000) });
    else if (m.delivery_status !== "failed") {
      const prefix = m.sender === "staff" ? "[Sent by our human consultant] " : m.message_type === "template" ? "[Automated template] " : "";
      out.push({ role: "assistant", content: prefix + text });
    }
  }
  // Merge consecutive same-role messages to keep the transcript compact.
  return out.reduce<ChatMessage[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.role === m.role && (m.role === "user" || m.role === "assistant") && typeof last.content === "string") {
      last.content = `${last.content}\n${m.content}`;
    } else acc.push({ ...m } as ChatMessage);
    return acc;
  }, []);
}

export type AgentResult = { reply: string | null; actions: string[]; handedOver: boolean; optedOut: boolean };

const MAX_STEPS = 6;
const MAX_SHARES_PER_TURN = 3;

export async function runAssistant(lead: Lead, history: ConversationRow[], effects: AgentEffects, now = new Date()): Promise<AgentResult> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${CORE_SYSTEM_PROMPT}\n\n${operatingRules(now)}\n\nCUSTOMER PROFILE (already known — do not ask again):\n${JSON.stringify(profileForPrompt(lead))}\n\nAREAS AND TYPES WE LIST:\n${JSON.stringify(inventoryOverview())}`,
    },
    ...historyToMessages(history),
  ];
  if (messages[messages.length - 1]?.role !== "user") {
    return { reply: null, actions: ["nothing_to_answer"], handedOver: false, optedOut: false };
  }

  const actions: string[] = [];
  let shares = 0;
  let handedOver = false;
  let optedOut = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    const { content, toolCalls } = await chatCompletion(messages, { tools: optedOut ? [] : TOOLS });
    if (!toolCalls.length) {
      return { reply: cleanReply(content), actions, handedOver, optedOut };
    }
    messages.push({ role: "assistant", content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      let result: unknown;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        result = await runTool(call.function.name, args);
      } catch (e) {
        result = { error: `Invalid tool call: ${(e as Error).message.slice(0, 200)}` };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 12_000) });
    }
  }
  // Too many tool steps — fall back to a safe reply.
  return { reply: null, actions: [...actions, "max_steps"], handedOver, optedOut };

  async function runTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case "search_properties": {
        const c = searchSchema.parse(args);
        actions.push("search");
        return await searchProperties({ ...c, limit: 5 });
      }
      case "get_property_details": {
        const { slug } = z.object({ slug: z.string().max(200) }).parse(args);
        const found = await getListing(slug);
        if (!found) return { error: "No such listing. Use only slugs returned by search_properties." };
        return listingDetails(found.property, found.availability);
      }
      case "share_property": {
        const { slug } = z.object({ slug: z.string().max(200) }).parse(args);
        if (shares >= MAX_SHARES_PER_TURN) return { error: "Already shared 3 listings this turn." };
        const found = await getListing(slug);
        if (!found || (found.availability !== "available" && found.availability !== "under_offer")) {
          return { error: "Listing not available." };
        }
        const p = found.property;
        const caption = [
          `*${p.title}*${p.community ? ` — ${p.community}` : ""}`,
          `📍 ${p.locality}, Hyderabad`,
          `💰 ${p.price == null ? "Price on request" : formatPrice(p)}`,
          found.availability === "under_offer" ? "⏳ Currently under offer — our team will confirm availability" : null,
          propertyUrl(p),
        ]
          .filter(Boolean)
          .join("\n");
        const ok = await effects.shareProperty(slug, caption);
        if (ok) {
          shares++;
          actions.push(`share:${slug}`);
          await effects.updateProfile({}, { requested_details: true });
        }
        return ok ? { sent: true } : { sent: false, note: "Could not send the photo; include the link in your reply instead.", url: propertyUrl(p) };
      }
      case "update_customer_profile": {
        const raw = (args ?? {}) as Record<string, unknown>;
        const requested = raw.requested_property_details === true;
        delete raw.requested_property_details;
        // Drop invalid fields instead of failing the whole update.
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          const one = profileSchema.safeParse({ [k]: v });
          if (one.success && v !== "" && v != null) clean[k] = v;
        }
        const patch = clean as ProfileUpdate;
        const signals: ScoreSignals = {
          has_budget: patch.budget || patch.budget_max || patch.budget_min ? true : undefined,
          has_location: patch.preferred_location ? true : undefined,
          has_requirement: patch.property_type || patch.configuration ? true : undefined,
          requested_details: requested || undefined,
        };
        await effects.updateProfile(patch, signals);
        actions.push(`profile:${Object.keys(patch).join(",")}`);
        return { saved: Object.keys(patch) };
      }
      case "request_human_handover": {
        const a = z
          .object({
            category: z.enum(["site_visit", "callback", "ready_to_buy", "negotiation", "legal_financial", "cannot_answer", "asked_for_human"]),
            details: z.string().max(400),
            preferred_time: z.string().max(120).optional(),
          })
          .parse(args);
        await effects.handover(a.category, a.details, a.preferred_time);
        handedOver = true;
        actions.push(`handover:${a.category}`);
        return { done: true, instruction: "Tell the customer warmly that a property consultant will contact them shortly. Do not ask further questions." };
      }
      case "record_opt_out": {
        await effects.optOut();
        optedOut = true;
        actions.push("opt_out");
        return { done: true, instruction: "Confirm in one short line that they will not receive further messages, and that they can message us any time." };
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  }
}

/** Removes markdown WhatsApp can't render and caps the length. */
export function cleanReply(text: string | null) {
  if (!text) return null;
  let t = text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1: $2") // [label](url) → label: url
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .trim();
  if (t.length > 1500) t = `${t.slice(0, 1497)}…`;
  return t || null;
}

export async function summarizeConversation(lead: Lead, history: ConversationRow[]) {
  const transcript = history
    .filter((m) => m.message_content)
    .slice(-40)
    .map((m) => `${m.message_direction === "inbound" ? "Customer" : m.sender === "staff" ? "Consultant" : "Assistant"}: ${m.message_content}`)
    .join("\n");
  const { content } = await chatCompletion(
    [
      { role: "system", content: SUMMARY_PROMPT },
      { role: "user", content: `Known profile: ${JSON.stringify(profileForPrompt(lead))}\n\nConversation:\n${transcript || "(no messages yet)"}` },
    ],
    { temperature: 0.2, maxTokens: 250 },
  );
  return content?.trim() ?? null;
}
