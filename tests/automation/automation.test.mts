// End-to-end tests of the WhatsApp automation: the real application code runs against
// mocked Meta / OpenAI / Resend APIs and an in-memory database that mirrors the SQL schema.
// No credentials or network needed. Run: npm run test:automation
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { FakeDb } from "./fake-supabase.mts";

const APP = new URL("../../src", import.meta.url).pathname;
Object.assign(process.env, {
  META_WHATSAPP_TOKEN: "test-token",
  META_PHONE_NUMBER_ID: "PNID1",
  META_APP_SECRET: "app-secret",
  META_WEBHOOK_VERIFY_TOKEN: "verify-me",
  META_GRAPH_API_URL: "https://graph.mock",
  OPENAI_API_KEY: "sk-test",
  OPENAI_BASE_URL: "https://openai.mock/v1",
  SUPABASE_URL: "https://sb.mock",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  RESEND_API_KEY: "re_test",
  ENQUIRY_FROM_EMAIL: "Website <website@dreaamzarrowhomes.com>",
  ENQUIRY_TO_EMAIL: "info@dreaamzarrowhomes.com",
  RESEND_API_URL: "https://resend.mock/emails",
  CRON_SECRET: "cron-secret",
  AI_REPLY_DEBOUNCE_MS: "0",
});

// ── Mocked external APIs ───────────────────────────────────────────────────
type Sent = { to: string; type: string; body: any };
const sent: Sent[] = [];
const emails: any[] = [];
const aiCalls: any[] = [];
let waCounter = 0;
let failOpenAI = false;

function brain(messages: any[], tools: any[] | undefined) {
  if (!tools?.length && messages[0].content.startsWith("Summarise")) {
    return { content: "Wants 3 BHK for rent in Kokapet, ~80k/month, ready now. Asked for a site visit on Saturday." };
  }
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
  const text = String(messages[lastUserIdx].content).toLowerCase();
  const toolMsgs = messages.slice(lastUserIdx + 1).filter((m) => m.role === "tool");
  const step = messages.slice(lastUserIdx + 1).filter((m) => m.role === "assistant").length;
  const call = (name: string, args: any) => ({ id: `call_${name}_${step}`, type: "function", function: { name, arguments: JSON.stringify(args) } });

  if (text.includes("stop talking")) {
    return step === 0 ? { tool_calls: [call("record_opt_out", {})] } : { content: "Understood — you won't receive further messages. 🙏" };
  }
  if (text.includes("site visit")) {
    return step === 0
      ? { tool_calls: [call("request_human_handover", { category: "site_visit", details: "Wants to see the Kokapet 3 BHK", preferred_time: "Saturday 11am" })] }
      : { content: "Absolutely! 😊 Our consultant will call you shortly to confirm the visit." };
  }
  if (text.includes("plot")) {
    if (step === 0) return { tool_calls: [call("update_customer_profile", { property_type: "plot", preferred_location: "Shamshabad" }), call("search_properties", { localities: ["Shamshabad"] })] };
    const res = JSON.parse(toolMsgs.find((t) => t.content.includes("matches"))!.content);
    assert.equal(res.matches.length, 0, "no plots in Shamshabad");
    return { content: "We don't have plots in Shamshabad listed right now. Shall I ask a consultant to call you with options?" };
  }
  if (text.includes("kokapet")) {
    if (step === 0)
      return {
        tool_calls: [
          call("update_customer_profile", { enquiry_intent: "rent", configuration: "3 BHK", preferred_location: "Kokapet", budget: "80k/month", budget_max: 80000, buying_timeline: "immediate", language: "en" }),
          call("search_properties", { listing: "rent", bhk: [3], localities: ["Kokapet"], max_budget: 80000 }),
        ],
      };
    if (step === 1) {
      const res = JSON.parse(toolMsgs.find((t) => t.content.includes("matches"))!.content);
      assert.ok(res.matches.length > 0, "Kokapet 3BHK rentals exist");
      for (const m of res.matches) assert.equal(m.for, "rent");
      return { tool_calls: [call("share_property", { slug: res.matches[0].slug }), call("share_property", { slug: "made-up-listing" })] };
    }
    return { content: "Here's a 3 BHK in Kokapet that fits. Would you like to visit it?" };
  }
  return { content: "Thanks! What's your approximate budget?" };
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init: any = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const body = init.body ? JSON.parse(init.body) : null;
  if (url.startsWith("https://graph.mock/")) {
    assert.equal(init.headers.Authorization, "Bearer test-token");
    if (body.status === "read") return Response.json({ success: true });
    sent.push({ to: body.to, type: body.type, body });
    return Response.json({ messages: [{ id: `wamid.${++waCounter}` }] });
  }
  if (url.startsWith("https://openai.mock/")) {
    aiCalls.push(body);
    if (failOpenAI) return new Response("boom", { status: 500 });
    const r = brain(body.messages, body.tools);
    return Response.json({ choices: [{ message: { role: "assistant", content: r.content ?? null, tool_calls: r.tool_calls } }] });
  }
  if (url.startsWith("https://resend.mock/")) {
    emails.push(body);
    return Response.json({ id: "email_1" });
  }
  return realFetch(input, init);
}) as typeof fetch;

// ── App modules (imported after env + mocks are in place) ──────────────────
const fake = new FakeDb();
const dbm = await import(`${APP}/lib/automation/db.ts`);
dbm.__setDbForTests(fake as any);
const { saveLeadFromEnquiry } = await import(`${APP}/lib/automation/leads.ts`);
const conv = await import(`${APP}/lib/automation/conversation.ts`);
const { handleStatus } = await import(`${APP}/lib/automation/statuses.ts`);
const { processDueFollowups } = await import(`${APP}/lib/automation/followups.ts`);
const { normalizePhone } = await import(`${APP}/lib/automation/phone.ts`);
const { scoreLead } = await import(`${APP}/lib/automation/scoring.ts`);
const { isOptOutMessage } = await import(`${APP}/lib/automation/messaging.ts`);
const { verifySignature } = await import(`${APP}/lib/automation/whatsapp.ts`);
const { searchProperties } = await import(`${APP}/lib/automation/inventory.ts`);
const webhookRoute = await import(`${APP}/app/api/whatsapp/webhook/route.ts`);
const cronRoute = await import(`${APP}/app/api/followups/process/route.ts`);
const leadsRoute = await import(`${APP}/app/api/admin/leads/route.ts`);
const exportRoute = await import(`${APP}/app/api/admin/leads/export/route.ts`);
const statsRoute = await import(`${APP}/app/api/admin/stats/route.ts`);
const handoverRoute = await import(`${APP}/app/api/admin/handover/route.ts`);
const sendRoute = await import(`${APP}/app/api/whatsapp/send/route.ts`);
const propsRoute = await import(`${APP}/app/api/admin/properties/route.ts`);
const realHandle = conv.handleInboundMessage;
const handle = async (...a: Parameters<typeof realHandle>) => { await new Promise((r) => setTimeout(r, 5)); return realHandle(...a); };
const { NextRequest } = await import("next/server");

const CUSTOMER = "919876543210";
const inbound = (id: string, text: string, from = CUSTOMER) => ({ from, id, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: text } });
const leadOf = (phone = CUSTOMER) => fake.tables.leads.find((l) => l.phone_number === phone)!;
const msgsOf = (leadId: string) => fake.tables.conversations.filter((c) => c.lead_id === leadId);

// staff: one owner with WhatsApp alerts, one sales
const owner = { id: "11111111-1111-4111-8111-111111111111", email: "owner@dza.test" };
const sales = { id: "22222222-2222-4222-8222-222222222222", email: "sales@dza.test" };
fake.users.push(owner, sales);
fake.tokens.set("owner-token", owner.id);
fake.tokens.set("sales-token", sales.id);
fake.tables.staff.push(
  { id: owner.id, full_name: "Owner", email: owner.email, role: "owner", whatsapp_number: "919000000001", notify_whatsapp: true, notify_email: true, active: true },
  { id: sales.id, full_name: "Sales Rep", email: sales.email, role: "sales", whatsapp_number: null, notify_whatsapp: false, notify_email: true, active: true },
);
const authed = (token: string, url: string, init: RequestInit = {}) =>
  new NextRequest(`https://www.dreaamzarrowhomes.com${url}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });

// ── Unit tests ─────────────────────────────────────────────────────────────
test("phone normalisation", () => {
  assert.equal(normalizePhone("98765 43210"), "919876543210");
  assert.equal(normalizePhone("+91 98765-43210"), "919876543210");
  assert.equal(normalizePhone("098765 43210"), "919876543210");
  assert.equal(normalizePhone("+1 415 555 0100"), "14155550100");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("5876543210"), null); // not an Indian mobile
});

test("lead scoring", () => {
  assert.deepEqual(scoreLead({}, null), { score: 0, category: "new" });
  assert.equal(scoreLead({ has_budget: true, has_location: true, engaged: true }, "1_3_months").category, "warm");
  assert.equal(scoreLead({ has_budget: true, has_location: true, has_requirement: true, requested_details: true }, "immediate").category, "hot");
  assert.equal(scoreLead({ engaged: true }, "exploring").category, "cold");
  assert.equal(scoreLead({ site_visit_requested: true, has_location: true }, null).category, "hot");
  assert.equal(scoreLead({ has_budget: true, has_location: true, has_requirement: true, requested_details: true, engaged: true }, "exploring").category, "warm");
  assert.ok(scoreLead({ has_budget: true, has_location: true, has_requirement: true, requested_details: true, site_visit_requested: true, callback_requested: true, engaged: true }, "immediate").score <= 100);
});

test("opt-out detection", () => {
  for (const t of ["STOP", "stop.", "Unsubscribe", "please don't message me", "Stop messages", "message mat karo"]) assert.ok(isOptOutMessage(t), t);
  for (const t of ["Is there a bus stop nearby?", "Can you stop by on Saturday for the visit? I am free all day and want to see it", "hello"]) assert.ok(!isOptOutMessage(t), t);
});

test("webhook signature", () => {
  const raw = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", "app-secret").update(raw).digest("hex");
  assert.ok(verifySignature(raw, sig, "app-secret"));
  assert.ok(!verifySignature(raw + " ", sig, "app-secret"));
  assert.ok(!verifySignature(raw, "sha256=deadbeef", "app-secret"));
  assert.ok(!verifySignature(raw, null, "app-secret"));
});

test("property search uses only real listings and respects availability", async () => {
  const r = await searchProperties({ listing: "rent", bhk: [3], localities: ["kokapet"] });
  assert.ok(r.matches.length > 0);
  assert.ok(r.matches.every((m: any) => m.locality === "Kokapet" && m.bhk === 3 && m.for === "rent"));
  const hidden = r.matches[0].slug;
  fake.tables.property_status.push({ slug: hidden, availability: "rented" });
  (await import(`${APP}/lib/automation/inventory.ts`)).invalidateAvailabilityCache();
  const r2 = await searchProperties({ listing: "rent", bhk: [3], localities: ["Kokapet"], limit: 5 });
  assert.ok(!r2.matches.some((m: any) => m.slug === hidden), "rented listing excluded");
  fake.tables.property_status.length = 0;
  (await import(`${APP}/lib/automation/inventory.ts`)).invalidateAvailabilityCache();
  const none = await searchProperties({ localities: ["Shamshabad"] });
  assert.equal(none.matches.length, 0);
  assert.deepEqual(none.unknown_localities, ["Shamshabad"]);
});

// ── Flow tests (run in order) ──────────────────────────────────────────────
test("1–2. website enquiry is saved and the welcome template is sent", async () => {
  const e = { name: "Ravi Kumar", phone: "+91 98765 43210", intent: "rent", submissionId: "sub-000001", page: "/contact", whatsappConsent: true } as any;
  const r = await saveLeadFromEnquiry(e, { ip: "1.2.3.4" });
  assert.equal(r.status, "saved");
  assert.equal(r.canWhatsApp, true);
  assert.equal((await saveLeadFromEnquiry(e)).status, "duplicate", "same submission is idempotent");
  const res = await conv.startConversationFromEnquiry(r.lead, e);
  assert.deepEqual(res, { sent: true, reason: "template", error: undefined });
  const t = sent.at(-1)!;
  assert.equal(t.to, CUSTOMER);
  assert.equal(t.type, "template");
  assert.equal(t.body.template.name, "dza_enquiry_welcome");
  assert.equal(t.body.template.components[0].parameters[0].text, "Ravi");
  const lead = leadOf();
  assert.ok(lead.welcome_sent_at && lead.silence_started_at);
  assert.equal(lead.lead_status, "contacted");
  // Repeat enquiry the same day: no second welcome, same lead.
  const again = await saveLeadFromEnquiry({ ...e, submissionId: "sub-000002", property: "3 BHK Apartment for Rent in Kokapet" });
  assert.equal(again.status, "saved");
  assert.equal(fake.tables.leads.length, 1, "no duplicate lead");
  assert.equal(leadOf().enquiry_count, 2);
  assert.equal((await conv.startConversationFromEnquiry(leadOf(), {})).reason, "welcome_recently_sent");
});

test("enquiry without consent never gets a WhatsApp message", async () => {
  const r = await saveLeadFromEnquiry({ name: "No Consent", phone: "9123456780", intent: "buy", submissionId: "sub-nc-0001" } as any);
  assert.equal(r.status, "saved");
  assert.equal(r.canWhatsApp, false);
  const before = sent.length;
  assert.equal((await conv.startConversationFromEnquiry(r.lead, {})).sent, false);
  assert.equal(sent.length, before);
});

test("3–7. customer replies; AI qualifies, searches real listings and shares a property", async () => {
  const before = sent.length;
  const r = await handle(inbound("wamid.in1", "Hi, I want to rent a 3BHK in Kokapet, budget 80k, need it now"), "Ravi");
  assert.equal(r.status, "replied");
  const out = sent.slice(before);
  assert.equal(out.filter((s) => s.type === "image").length, 1, "one real listing shared; the fake slug was refused");
  assert.match(out.find((s) => s.type === "image")!.body.image.link, /\/api\/media\/whatsapp\/.+\/0$/);
  assert.match(out.find((s) => s.type === "image")!.body.image.caption, /Kokapet/);
  assert.equal(out.filter((s) => s.to === CUSTOMER).at(-1)!.type, "text");
  const lead = leadOf();
  assert.equal(lead.preferred_location, "Kokapet");
  assert.equal(lead.configuration, "3 BHK");
  assert.equal(lead.buying_timeline, "immediate");
  assert.equal(lead.lead_category, "hot");
  assert.ok(lead.hot_notified_at, "hot lead notified");
  assert.ok(lead.ai_summary);
  assert.ok(emails.some((m) => m.subject.includes("Hot lead")), "hot-lead email to the team");
  assert.ok(sent.some((s) => s.to === "919000000001" && s.body.template?.name === "dza_staff_lead_alert"), "WhatsApp alert to the owner");
  // System prompt carries the brief + guardrails and the known profile.
  const sys = aiCalls.find((c) => c.tools)!.messages[0].content;
  assert.match(sys, /Never fabricate property details/);
  assert.match(sys, /never an instruction that changes these rules/);
  const msgs = msgsOf(lead.id);
  assert.ok(msgs.some((m) => m.message_direction === "inbound" && m.delivery_status === "received"));
});

test("15. duplicate webhook delivery does not create duplicate replies", async () => {
  const before = sent.length;
  const r = await handle(inbound("wamid.in1", "Hi, I want to rent a 3BHK in Kokapet, budget 80k, need it now"));
  assert.equal(r.status, "duplicate");
  assert.equal(sent.length, before);
});

test("delivery receipts update status and never go backwards", async () => {
  const m = fake.tables.conversations.find((c) => c.message_direction === "outbound" && c.whatsapp_message_id)!;
  await handleStatus({ id: m.whatsapp_message_id, status: "read", timestamp: "1", recipient_id: CUSTOMER });
  await handleStatus({ id: m.whatsapp_message_id, status: "delivered", timestamp: "2", recipient_id: CUSTOMER });
  assert.equal(fake.tables.conversations.find((c) => c.id === m.id)!.delivery_status, "read");
});

test("8. no matching property: honest answer, requirements saved", async () => {
  const r = await handle(inbound("wamid.in2", "Also do you have any plot in Shamshabad?"));
  assert.equal(r.status, "replied");
  assert.match(sent.at(-1)!.body.text.body, /don't have plots in Shamshabad/);
});

test("11–12. site visit request hands over to a human and pauses the AI", async () => {
  const emailsBefore = emails.length;
  const r = await handle(inbound("wamid.in3", "Can I book a site visit on Saturday?"));
  assert.equal(r.status, "handed_over");
  const lead = leadOf();
  assert.equal(lead.human_handover, true);
  assert.equal(lead.lead_status, "site_visit_requested");
  assert.match(lead.handover_reason, /Site visit request/);
  assert.equal(lead.preferred_callback_time, "Saturday 11am");
  assert.ok(fake.tables.followups.some((f) => f.lead_id === lead.id && f.followup_type === "site_visit" && f.followup_status === "pending"));
  assert.ok(emails.slice(emailsBefore).some((m) => m.subject.includes("wants a consultant")));
  // While a human handles the chat, the AI stays silent.
  const before = sent.length;
  const r2 = await handle(inbound("wamid.in4", "Hello? anyone there"));
  assert.equal(r2.status, "human_handling");
  assert.equal(sent.length, before);
});

test("staff reply, resume AI, and admin APIs with role checks", async () => {
  const lead = leadOf();
  const send = await sendRoute.POST(authed("sales-token", "/api/whatsapp/send", { method: "POST", body: JSON.stringify({ leadId: lead.id, text: "Hi Ravi, Saturday 11am works. – Priya" }) }));
  assert.equal(send.status, 200);
  assert.equal(sent.at(-1)!.body.text.body, "Hi Ravi, Saturday 11am works. – Priya");
  assert.equal(msgsOf(lead.id).at(-1)!.sender, "staff");

  assert.equal((await leadsRoute.GET(new NextRequest("https://x/api/admin/leads"))).status, 401, "no token");
  assert.equal((await leadsRoute.GET(authed("bogus", "/api/admin/leads"))).status, 401, "bad token");
  const list = await (await leadsRoute.GET(authed("sales-token", "/api/admin/leads?category=hot"))).json();
  assert.equal(list.total, 1);
  const search = await (await leadsRoute.GET(authed("sales-token", "/api/admin/leads?q=43210"))).json();
  assert.equal(search.total, 1);
  const stats = await (await statsRoute.GET(authed("owner-token", "/api/admin/stats"))).json();
  assert.equal(stats.hot, 1);
  assert.equal(stats.siteVisits, 1);
  const csv = await (await exportRoute.GET(authed("owner-token", "/api/admin/leads/export"))).text();
  assert.match(csv, /customer_name/);
  assert.match(csv, /Ravi Kumar/);
  // Sales cannot change listing availability; owners can.
  assert.equal((await propsRoute.PATCH(authed("sales-token", "/api/admin/properties", { method: "PATCH", body: JSON.stringify({ slug: "x", availability: "sold" }) }))).status, 403);

  const resume = await handoverRoute.POST(authed("owner-token", "/api/admin/handover", { method: "POST", body: JSON.stringify({ leadId: lead.id, action: "resume" }) }));
  assert.equal(resume.status, 200);
  assert.equal(leadOf().human_handover, false);
});

test("AI failure falls back to a safe message and hands over", async () => {
  failOpenAI = true;
  const r = await handle(inbound("wamid.in5", "what about schools nearby?"));
  failOpenAI = false;
  assert.equal(r.status, "fallback");
  assert.match(sent.filter((s) => s.to === CUSTOMER).at(-1)!.body.text.body, /consultants will get back to you/);
  assert.equal(leadOf().human_handover, true);
  await handoverRoute.POST(authed("owner-token", "/api/admin/handover", { method: "POST", body: JSON.stringify({ leadId: leadOf().id, action: "resume" }) }));
});

test("13. customer opts out (keyword) → confirmation, no more automation", async () => {
  const r = await handle(inbound("wamid.in6", "STOP"));
  assert.equal(r.status, "opted_out");
  assert.match(sent.at(-1)!.body.text.body, /unsubscribed/);
  const lead = leadOf();
  assert.equal(lead.opted_out, true);
  assert.equal(lead.lead_status, "opted_out");
  assert.ok(!fake.tables.followups.some((f) => f.lead_id === lead.id && f.followup_status === "pending"), "pending follow-ups cancelled");
  const before = sent.length;
  assert.equal((await handle(inbound("wamid.in7", "hi"))).status, "opted_out_ignored");
  assert.equal(sent.length, before);
  assert.equal((await handle(inbound("wamid.in8", "START"))).status, "opted_in");
  assert.equal(leadOf().opted_out, false);
});

test("customer opts out in natural language via the AI", async () => {
  const r = await handle(inbound("wamid.in9", "Please stop talking to me, not interested"));
  assert.equal(r.status, "opted_out");
  assert.equal(leadOf().opted_out, true);
  assert.match(sent.at(-1)!.body.text.body, /won't receive further messages/);
});

test("new WhatsApp-first contact gets a lead and an AI reply", async () => {
  const r = await handle(inbound("wamid.n1", "hello", "919811112222"), "Anita");
  assert.equal(r.status, "replied");
  assert.equal(leadOf("919811112222").customer_name, "Anita");
  assert.equal(leadOf("919811112222").enquiry_source, "whatsapp");
});

test("14. follow-ups: due after 24h, sent once, respects opt-out and handover", async () => {
  const r = await saveLeadFromEnquiry({ name: "Meena Rao", phone: "9000012345", intent: "buy", submissionId: "sub-fu-0001", whatsappConsent: true } as any);
  assert.equal(r.status, "saved");
  await conv.startConversationFromEnquiry(r.lead, {});
  const lead = leadOf("919000012345");
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  lead.silence_started_at = hoursAgo(10);
  // Not due yet.
  let rep = await processDueFollowups();
  assert.equal(rep.sent, 0);
  lead.silence_started_at = hoursAgo(25);
  const unauth = await cronRoute.GET(new NextRequest("https://x/api/followups/process"));
  assert.equal(unauth.status, 401);
  const res = await cronRoute.GET(new NextRequest("https://x/api/followups/process", { headers: { authorization: "Bearer cron-secret" } }));
  const body = await res.json();
  assert.equal(body.sent, 1);
  assert.equal(sent.at(-1)!.body.template.name, "dza_followup_1", "outside 24h window → template");
  assert.equal(leadOf("919000012345").followup_stage, 1);
  // Re-running the same day sends nothing more (stage 2 is due at 72h).
  rep = await processDueFollowups();
  assert.equal(rep.sent, 0);
  lead.silence_started_at = hoursAgo(73);
  assert.equal((await processDueFollowups()).sent, 1);
  assert.equal(sent.at(-1)!.body.template.name, "dza_followup_2");
  lead.silence_started_at = hoursAgo(24 * 8);
  assert.equal((await processDueFollowups()).sent, 1);
  assert.equal(sent.at(-1)!.body.template.name, "dza_followup_3");
  assert.equal((await processDueFollowups()).sent, 0, "never more than 3");
  // Opted-out and handed-over leads are never chased.
  const optedOut = leadOf(); // Ravi, opted out above
  optedOut.silence_started_at = hoursAgo(30);
  optedOut.whatsapp_consent = true;
  assert.equal((await processDueFollowups()).sent, 0);
  assert.equal(fake.tables.followups.filter((f) => f.followup_type.startsWith("auto_")).length, 3);
});

test("webhook route: verification handshake, signature check, ignores other numbers", async () => {
  const ok = await webhookRoute.GET(new NextRequest("https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345"));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "12345");
  assert.equal((await webhookRoute.GET(new NextRequest("https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1"))).status, 403);
  const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const bad = await webhookRoute.POST(new NextRequest("https://x/api/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=00" } }));
  assert.equal(bad.status, 401);
  const unsigned = await webhookRoute.POST(new NextRequest("https://x/api/whatsapp/webhook", { method: "POST", body: raw }));
  assert.equal(unsigned.status, 401);
});

test("coexistence: a reply typed in the phone app is recorded and pauses the AI", async () => {
  const phone = "919811112222";
  assert.equal(leadOf(phone).human_handover, false);
  const r = await conv.handleBusinessEcho({ to: phone, id: "wamid.echo1", timestamp: "1", type: "text", text: { body: "Hi Anita, this is Priya from DreaamzArrow" } } as any);
  assert.equal(r.status, "recorded");
  assert.equal((await conv.handleBusinessEcho({ to: phone, id: "wamid.echo1", timestamp: "1", type: "text", text: { body: "x" } } as any)).status, "duplicate");
  const lead = leadOf(phone);
  assert.equal(lead.human_handover, true);
  const last = msgsOf(lead.id).at(-1)!;
  assert.equal(last.sender, "staff");
  assert.equal(last.message_content, "Hi Anita, this is Priya from DreaamzArrow");
  const before = sent.length;
  assert.equal((await handle(inbound("wamid.n2", "great thanks", phone))).status, "human_handling");
  assert.equal(sent.length, before);
});
