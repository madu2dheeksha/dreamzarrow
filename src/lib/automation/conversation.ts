import "server-only";
import { aiEnabled, openaiConfig, templateNames } from "./config";
import { requireDb, type Lead } from "./db";
import { runAssistant, summarizeConversation, type AgentEffects, type HandoverCategory } from "./ai/agent";
import { whatsappImageUrl } from "./inventory";
import { claimWebhookEvent, getLead, getLeadByPhone, recentMessages, recordMessage, rescoreLead, updateLead } from "./leads";
import { inServiceWindow, isOptInMessage, isOptOutMessage, sendToLead } from "./messaging";
import { notifyTeam } from "./notify";
import { describeInbound, markRead, type WaInboundMessage } from "./whatsapp";
import { properties } from "@/content/properties";

const HANDOVER_LABEL: Record<HandoverCategory, string> = {
  site_visit: "Site visit request",
  callback: "Callback request",
  ready_to_buy: "Ready to buy/rent",
  negotiation: "Negotiation / pricing",
  legal_financial: "Legal / financial question",
  cannot_answer: "AI could not answer",
  asked_for_human: "Asked for a person",
};

const HANDOVER_MESSAGE =
  "Absolutely! 😊 I'd be happy to connect you with one of our property consultants. Our team will get in touch with you shortly to assist further.";

const FALLBACK_MESSAGE =
  "Thank you for your message! 🙏 One of our property consultants will get back to you shortly. For anything urgent, you can call us on +91 88869 13334.";

/** How long to wait for a customer to finish typing several short messages before replying once. */
const DEBOUNCE_MS = Number(process.env.AI_REPLY_DEBOUNCE_MS ?? 4000);

// ── Website enquiry → first WhatsApp message ────────────────────────────────

export function welcomeText(name: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return `Hello ${first}! 👋
Thank you for connecting with DreaamzArrow Homes!
We would love to help you find the perfect property in Hyderabad.
I'm your virtual property assistant, and I'll help you explore properties based on your preferences and budget.
May I know what you're looking for?

1. Buy a Property
2. Rent a Property
3. Investment Opportunities
4. Commercial Property

Looking forward to helping you! 🏡`;
}

/**
 * Starts (or continues) the WhatsApp conversation after a website enquiry.
 * Outside the 24h window only the approved welcome template may be sent.
 */
export async function startConversationFromEnquiry(lead: Lead, enquiry: { property?: string }) {
  if (!lead.whatsapp_consent || lead.opted_out) return { sent: false, reason: "no_consent" };

  if (inServiceWindow(lead)) {
    const body = enquiry.property
      ? `Thanks ${lead.customer_name.split(" ")[0]}! We've received your enquiry about *${enquiry.property}*. Would you like more details, or shall I arrange for a consultant to call you?`
      : `Thanks ${lead.customer_name.split(" ")[0]}! We've received your new enquiry. How can I help you today?`;
    const r = await sendToLead(lead, { kind: "text", body }, "ai");
    return { sent: r.ok, reason: r.ok ? "in_window" : r.reason };
  }

  // Never send the welcome twice in a day for repeat enquiries.
  if (lead.welcome_sent_at && Date.now() - new Date(lead.welcome_sent_at).getTime() < 24 * 3600_000) {
    return { sent: false, reason: "welcome_recently_sent" };
  }

  const firstName = lead.customer_name.trim().split(/\s+/)[0] || "there";
  const r = await sendToLead(
    lead,
    { kind: "template", name: templateNames.welcome, language: templateNames.language, params: [firstName], preview: welcomeText(lead.customer_name) },
    "system",
  );
  if (r.ok) {
    await updateLead(lead.id, { welcome_sent_at: new Date().toISOString(), lead_status: lead.lead_status === "new" ? "contacted" : lead.lead_status });
  }
  return { sent: r.ok, reason: r.ok ? "template" : r.reason, error: r.ok ? undefined : r.error };
}

// ── Inbound WhatsApp message → AI reply ─────────────────────────────────────

export async function handleInboundMessage(m: WaInboundMessage, profileName?: string) {
  if (!(await claimWebhookEvent(`msg:${m.id}`))) return { status: "duplicate" as const };

  const sb = requireDb();
  const { text, kind } = describeInbound(m);
  const at = new Date(Number(m.timestamp) * 1000 || Date.now()).toISOString();

  let lead = await getLeadByPhone(m.from);
  if (!lead) {
    // The customer messaged us first (e.g. from the website's WhatsApp button).
    const { data, error } = await sb
      .from("leads")
      .insert({
        customer_name: (profileName ?? "").trim().slice(0, 80) || "WhatsApp contact",
        phone_number: m.from,
        enquiry_source: m.referral?.source_url ? "whatsapp_ad" : "whatsapp",
        lead_status: "new",
      })
      .select("*")
      .single();
    if (error && error.code === "23505") lead = await getLeadByPhone(m.from);
    else if (error) throw new Error(`lead create failed: ${error.message}`);
    else lead = data as Lead;
  }
  if (!lead) throw new Error("lead not found after create");

  if (kind === "reaction" || kind === "sticker") {
    await recordMessage({ lead_id: lead.id, whatsapp_message_id: m.id, message_direction: "inbound", sender: "customer", message_content: `[${kind}]`, message_type: kind, delivery_status: "received", timestamp: at });
    return { status: "ignored" as const };
  }

  await recordMessage({
    lead_id: lead.id,
    whatsapp_message_id: m.id,
    message_direction: "inbound",
    sender: "customer",
    message_content: text,
    message_type: kind,
    delivery_status: "received",
    // Receipt time keeps the transcript in true order (Meta timestamps are whole seconds and can lag our own sends).
    timestamp: new Date().toISOString(),
  });
  // The customer replied: reset the follow-up sequence and open the 24h window.
  lead = await updateLead(lead.id, { last_inbound_at: at, silence_started_at: null, followup_stage: 0 });
  await sb.from("followups").update({ followup_status: "cancelled" }).eq("lead_id", lead.id).eq("followup_status", "pending").like("followup_type", "auto_%");
  ({ lead } = await rescoreLead(lead, { engaged: true }));
  void markRead(m.id);

  // Opt-out / opt-in keywords are handled deterministically, before any AI.
  if (isOptOutMessage(text)) {
    await sendToLead(lead, { kind: "text", body: "You're unsubscribed ✅ You won't receive further messages from DreaamzArrow Homes. If you ever need help, just message us." }, "system");
    await optOutLead(lead.id);
    return { status: "opted_out" as const };
  }
  if (lead.opted_out) {
    if (isOptInMessage(text)) {
      lead = await updateLead(lead.id, { opted_out: false, opted_out_at: null, whatsapp_consent: true, consent_at: new Date().toISOString(), consent_source: "whatsapp:START", consent_text: "Customer replied START", lead_status: "contacted" });
      await sendToLead(lead, { kind: "text", body: "Welcome back! 😊 How can we help you find a property today?" }, "system");
      return { status: "opted_in" as const };
    }
    // Respect the opt-out: no automated conversation; staff can still see the message in the dashboard.
    return { status: "opted_out_ignored" as const };
  }

  if (lead.human_handover) return { status: "human_handling" as const };

  if (!aiEnabled() || !openaiConfig()) {
    await handOver(lead, "cannot_answer", "AI assistant is switched off — please reply manually.");
    return { status: "no_ai" as const };
  }

  // Wait briefly; if the customer sent another message meanwhile, let that invocation reply to both.
  if (DEBOUNCE_MS > 0) await new Promise((r) => setTimeout(r, DEBOUNCE_MS));
  const { data: latest } = await sb
    .from("conversations")
    .select("whatsapp_message_id")
    .eq("lead_id", lead.id)
    .eq("message_direction", "inbound")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest?.whatsapp_message_id && latest.whatsapp_message_id !== m.id) return { status: "debounced" as const };

  return replyWithAssistant(lead.id);
}

async function optOutLead(leadId: string) {
  const sb = requireDb();
  await updateLead(leadId, { opted_out: true, opted_out_at: new Date().toISOString(), lead_status: "opted_out", silence_started_at: null });
  await sb.from("followups").update({ followup_status: "cancelled" }).eq("lead_id", leadId).eq("followup_status", "pending");
}

export async function handOver(lead: Lead, category: HandoverCategory, details: string, preferredTime?: string) {
  const reason = `${HANDOVER_LABEL[category]}: ${details}${preferredTime ? ` (preferred time: ${preferredTime})` : ""}`;
  let updated = await updateLead(lead.id, {
    human_handover: true,
    handover_reason: reason.slice(0, 500),
    handover_at: new Date().toISOString(),
    lead_status: category === "site_visit" ? "site_visit_requested" : "human_handover",
    ...(preferredTime ? { preferred_callback_time: preferredTime } : {}),
  });
  ({ lead: updated } = await rescoreLead(updated, {
    site_visit_requested: category === "site_visit" || undefined,
    callback_requested: category === "callback" || category === "asked_for_human" || undefined,
  }));
  await requireDb()
    .from("followups")
    .insert({ lead_id: lead.id, followup_date: new Date().toISOString(), followup_type: category === "site_visit" ? "site_visit" : "call", notes: reason.slice(0, 500) });
  await refreshSummary(updated);
  await notifyTeam("handover", (await getLead(lead.id)) ?? updated);
  return updated;
}

export async function refreshSummary(lead: Lead) {
  if (!openaiConfig()) return lead;
  try {
    const summary = await summarizeConversation(lead, await recentMessages(lead.id, 60));
    if (summary) return await updateLead(lead.id, { ai_summary: summary, ai_summary_at: new Date().toISOString() });
  } catch (e) {
    console.error("[conversation] summary failed:", (e as Error).message);
  }
  return lead;
}

/** Runs the AI for a lead's latest unanswered message(s) and sends the reply. */
export async function replyWithAssistant(leadId: string) {
  let lead = (await getLead(leadId))!;
  let becameHot = false;

  const effects: AgentEffects = {
    async updateProfile(patch, signals) {
      const { requirements_note, ...cols } = patch;
      const extra: Record<string, unknown> = { ...cols };
      if (requirements_note) extra.customer_requirements = [lead.customer_requirements, requirements_note].filter(Boolean).join("\n").slice(-4000);
      if (cols.enquiry_intent && lead.lead_status === "new") extra.lead_status = "contacted";
      const r = await rescoreLead(lead, signals, extra);
      lead = r.lead;
      becameHot ||= r.becameHot;
    },
    async shareProperty(slug, caption) {
      const p = properties.find((x) => x.slug === slug);
      if (!p) return false;
      const r = await sendToLead(lead, { kind: "image", link: whatsappImageUrl(p), caption }, "ai");
      if (r.ok) return true;
      const t = await sendToLead(lead, { kind: "text", body: caption }, "ai");
      return t.ok;
    },
    async handover(category, details, preferredTime) {
      lead = await handOver(lead, category, details, preferredTime);
    },
    async optOut() {
      await optOutLead(lead.id);
    },
  };

  let reply: string | null = null;
  let handedOver = false;
  let optedOut = false;
  try {
    const history = await recentMessages(lead.id, 30);
    const r = await runAssistant(lead, history, effects);
    if (r.actions.includes("nothing_to_answer")) return { status: "nothing_to_answer" as const };
    ({ reply, handedOver, optedOut } = r);
    if (!reply && !optedOut) reply = handedOver ? HANDOVER_MESSAGE : null;
    if (!reply && !optedOut && !handedOver) throw new Error(`assistant returned no reply (${r.actions.join(",")})`);
  } catch (e) {
    console.error("[conversation] AI failed, handing over:", (e as Error).message);
    const fresh = (await getLead(lead.id)) ?? lead;
    await sendToLead(fresh, { kind: "text", body: FALLBACK_MESSAGE }, "system");
    if (!fresh.human_handover) await handOver(fresh, "cannot_answer", "The AI assistant hit an error; please continue this chat.");
    return { status: "fallback" as const };
  }

  if (reply) {
    // Re-read: an opt-out recorded by the AI flips the lead, and the confirmation itself must still go out.
    const current = (await getLead(lead.id)) ?? lead;
    if (optedOut) {
      await sendToLead({ ...current, opted_out: false }, { kind: "text", body: reply }, "ai");
    } else {
      await sendToLead(current, { kind: "text", body: reply }, "ai");
    }
  }

  if (becameHot && !handedOver && !optedOut) {
    const withSummary = await refreshSummary((await getLead(lead.id)) ?? lead);
    await updateLead(lead.id, { hot_notified_at: new Date().toISOString() });
    await notifyTeam("hot_lead", withSummary);
  } else if (becameHot) {
    await updateLead(lead.id, { hot_notified_at: new Date().toISOString() });
  }
  return { status: handedOver ? ("handed_over" as const) : optedOut ? ("opted_out" as const) : ("replied" as const) };
}

// ── Coexistence: a salesperson replied from the WhatsApp Business app on the phone ──

/**
 * With coexistence, replies typed in the WhatsApp Business app arrive as
 * `smb_message_echoes`. We store them in the conversation and pause the AI so the
 * assistant never talks over a person who is already chatting with the customer.
 */
export async function handleBusinessEcho(echo: Omit<WaInboundMessage, "from"> & { to: string }) {
  if (echo.type === "revoke" || echo.type === "edit") return { status: "ignored" as const };
  if (!(await claimWebhookEvent(`echo:${echo.id}`))) return { status: "duplicate" as const };
  const { text, kind } = describeInbound({ ...echo, from: echo.to } as WaInboundMessage);
  let lead = await getLeadByPhone(echo.to);
  if (!lead) {
    const { data, error } = await requireDb()
      .from("leads")
      .insert({ customer_name: "WhatsApp contact", phone_number: echo.to, enquiry_source: "whatsapp_app", lead_status: "contacted" })
      .select("*")
      .single();
    if (error && error.code !== "23505") throw new Error(`lead create failed: ${error.message}`);
    lead = (data as Lead) ?? (await getLeadByPhone(echo.to));
  }
  if (!lead) return { status: "ignored" as const };
  await recordMessage({
    lead_id: lead.id,
    whatsapp_message_id: echo.id,
    message_direction: "outbound",
    sender: "staff",
    message_content: text.replace(/^\[Customer sent/, "[Sent").replace(/^\[Customer shared/, "[Shared"),
    message_type: kind,
    delivery_status: "sent",
  });
  await updateLead(lead.id, {
    last_outbound_at: new Date().toISOString(),
    ...(lead.human_handover ? {} : { human_handover: true, handover_at: new Date().toISOString(), handover_reason: "Replied from the WhatsApp Business app" }),
  });
  return { status: "recorded" as const };
}
