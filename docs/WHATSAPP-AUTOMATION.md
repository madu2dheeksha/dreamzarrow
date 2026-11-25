# WhatsApp AI automation — architecture, setup and go-live

This adds an AI property assistant on WhatsApp, a leads database, automatic follow-ups,
hot-lead alerts and a staff dashboard to the existing website. **Nothing changes for visitors
until the environment variables below are set**: without them the site behaves exactly as before.

> Status: built and tested against mocked Meta/OpenAI/Supabase APIs (`npm run test:automation`,
> 20 scenarios). It is **not yet tested end-to-end on real WhatsApp** — do that with Meta's
> test number (step 7) before switching on the business number.

---

## 1. How it works

```
Website enquiry form ──► POST /api/enquiry
   (WhatsApp opt-in box)      ├─ saves/merges the lead in Supabase (one lead per phone number)
                              ├─ emails/webhooks the team as before (Resend / LEAD_WEBHOOK_URL)
                              └─ after responding: sends the approved WELCOME TEMPLATE on WhatsApp
                                                     │
Customer replies on WhatsApp ──► Meta ──► POST /api/whatsapp/webhook  (signature-verified, de-duplicated)
                                             ├─ stores the message, resets follow-ups
                                             ├─ STOP / START handled without AI
                                             ├─ if a person has taken over → AI stays silent
                                             └─ AI assistant (OpenAI, tool calling)
                                                  ├─ search_properties / get_property_details  → src/content/properties.json
                                                  │     (+ availability set by staff in /admin)
                                                  ├─ share_property  → photo (JPEG) + price + link
                                                  ├─ update_customer_profile → lead fields + score
                                                  ├─ request_human_handover → pauses AI, alerts team
                                                  └─ record_opt_out
Hot lead / handover ──► email (Resend) + WhatsApp template to staff + highlighted in /admin
Daily 10:00 IST ──► /api/followups/process  (Vercel Cron) → follow-ups after 1, 3, 7 days of silence
Staff ──► /admin  (Supabase sign-in; owner / sales roles)
```

**Source of truth for listings:** the website's own `src/content/properties.json`. The database
only stores what that file can't: live availability (Available / Under offer / Sold / Rented / Hidden),
which owners set in **/admin → Listings**. The AI is told to use only tool results, never to state
prices that are "on request", brochures, approvals, possession dates, discounts or returns — those
go to a consultant.

**Lead scoring is rule-based** (`src/lib/automation/scoring.ts`), not decided by the AI, so it is
consistent and can't be talked up: budget +20, location +15, requirement +10, asked for details +10,
site visit +25, callback +15, replied +5, timeline (now +30 / 1–3 m +20 / 3–6 m +10).
Hot ≥ 70 (or a site-visit request with a budget or location); warm 40–69; cold below 40.

### Files

| Area | Files |
| --- | --- |
| Database schema | `supabase/migrations/20261125000000_whatsapp_automation.sql` |
| Enquiry capture | `src/app/api/enquiry/route.ts`, `src/components/enquiry-form.tsx` (opt-in box), `src/lib/enquiry-schema.ts` |
| WhatsApp | `src/lib/automation/whatsapp.ts` (Cloud API client, signature check), `src/app/api/whatsapp/webhook/route.ts`, `src/app/api/whatsapp/send/route.ts`, `src/lib/automation/statuses.ts` |
| Conversation logic | `src/lib/automation/conversation.ts`, `messaging.ts` (consent, 24h window, opt-out), `leads.ts` |
| AI | `src/lib/automation/ai/agent.ts` (tools), `ai/prompt.ts` (system prompt), `ai/openai.ts`, `src/app/api/ai/chat/route.ts` (dry-run playground) |
| Listings for AI | `src/lib/automation/inventory.ts`, `src/app/api/media/whatsapp/[slug]/[index]/route.ts` (WebP → JPEG) |
| Follow-ups | `src/lib/automation/followups.ts`, `src/app/api/followups/process/route.ts`, `vercel.json` |
| Alerts | `src/lib/automation/notify.ts` |
| Dashboard | `src/app/admin/page.tsx`, `src/components/admin/*`, `src/app/api/admin/*` |
| Tests | `tests/automation/` — `npm run test:automation` |

### Security

- All secrets are server-only env vars. The only public values are the Supabase URL and **anon** key,
  used solely to sign staff in. Every table has Row Level Security **on with no policies**, so the
  anon key can read nothing; data flows only through server routes that check the staff session.
- Webhooks are rejected unless Meta's `X-Hub-Signature-256` matches `META_APP_SECRET`.
- Meta retries are de-duplicated (`webhook_events`), enquiry retries by `submission_id`, leads by phone number.
- The AI can only act on the one customer it is serving, through six validated tools. It cannot run
  queries, see other customers or change prices. Customer text is treated as data, never instructions.
- `/admin` is `noindex` and blocked in `robots.txt`; CSV export escapes formula injection.

---

## 2. Supabase (database + staff sign-in)

1. Create a project at [supabase.com](https://supabase.com) — region **Mumbai (ap-south-1)**.
2. **SQL Editor → New query**, paste the whole of `supabase/migrations/20261125000000_whatsapp_automation.sql`, **Run**.
3. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key.
4. Create the first owner: **Authentication → Users → Add user → Create new user** (email + password,
   tick *Auto confirm*). Then in the SQL Editor:
   ```sql
   insert into public.staff (id, full_name, email, role, whatsapp_number, notify_whatsapp)
   select id, 'Your Name', email, 'owner', '91XXXXXXXXXX', true
   from auth.users where email = 'you@dreaamzarrowhomes.com';
   ```
   Further team members can then be added from **/admin → Team**.
5. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up" so only staff
   you create can log in.

## 3. OpenAI

Create an API key at [platform.openai.com](https://platform.openai.com/api-keys) with billing enabled.
Default model is `gpt-4.1-mini` (set `OPENAI_MODEL` to change it). Consider a monthly usage limit.

## 4. Resend (team email alerts — optional but recommended)

The site already supports Resend for enquiry emails. In Resend, add the domain
`dreaamzarrowhomes.com` and add the DNS records it shows at **Bluehost → DNS**. Resend uses its own
`send.` subdomain and a `resend._domainkey` record, so **do not change the existing `@` MX or SPF
records** — your info@ mailbox keeps working. Then set `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, `ENQUIRY_TO_EMAIL`.

## 5. Meta / WhatsApp Cloud API

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create app** → use case
   *Connect with customers through WhatsApp* → connect your Meta business portfolio.
2. **WhatsApp → API Setup**: Meta gives you a **test number**. Note the **Phone number ID** and
   **WhatsApp Business Account ID**. Add your own phone as a test recipient.
3. **App settings → Basic → App secret** → `META_APP_SECRET`.
4. **Permanent token**: Business settings → Users → **System users** → add an admin system user →
   assign the app and the WhatsApp account → **Generate token** with `whatsapp_business_messaging`
   and `whatsapp_business_management` → `META_WHATSAPP_TOKEN`. (The 24-hour token on the API Setup
   page is fine for a first test only.)
5. **WhatsApp → Configuration → Webhook**: deploy first (step 6), then set
   - Callback URL: `https://www.dreaamzarrowhomes.com/api/whatsapp/webhook`
   - Verify token: the same random string as `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the **messages** field (and **smb_message_echoes** once the real number is connected in coexistence mode, see §8).

### Message templates (WhatsApp Manager → Message templates → Create)

Templates are required for any message sent more than 24 hours after the customer's last message —
the welcome and the follow-ups. Use these names (or change them with the `WA_TEMPLATE_*` variables).
Language: **English**. Meta decides the final category; expect *Marketing* for the customer templates.

| Name | Category | Body | Buttons |
| --- | --- | --- | --- |
| `dza_enquiry_welcome` | Marketing | Hello {{1}}! 👋 Thank you for connecting with DreaamzArrow Homes! We would love to help you find the perfect property in Hyderabad. I'm your virtual property assistant, and I'll help you explore properties based on your preferences and budget. May I know what you're looking for? | Quick replies: *Buy a Property* · *Rent a Property* · *Investment* · *Commercial Property* |
| `dza_followup_1` | Marketing | Hello {{1}}! 😊 Just checking if you're still exploring properties in Hyderabad. We'd be happy to help you find options that match your budget and preferences. Would you like us to share some suitable properties? | *Yes, share options* · *Stop messages* |
| `dza_followup_2` | Marketing | Hi {{1}}, new homes are added to our listings regularly. If you share your preferred area and budget, we'll send you the best matches. | *Share options* · *Stop messages* |
| `dza_followup_3` | Marketing | Hi {{1}}, this is our last check-in 🙂 Whenever you're ready to look at properties in Hyderabad, just message us here and our team will help. Thank you for considering DreaamzArrow Homes! | *Stop messages* |
| `dza_staff_lead_alert` | Utility | New lead alert ({{1}}): {{2}}. Interest: {{3}}. Score: {{4}}. Summary: {{5}}. Open in dashboard: {{6}} — DreaamzArrow Leads | — |

Add a footer such as "Reply STOP to unsubscribe" to the marketing templates. When asked for
samples use e.g. `Ravi`, or for the alert: `HOT LEAD`, `Ravi Kumar (+91 98765 43210)`,
`rent 3 BHK; budget 80k; location Kokapet; timeline Ready now`, `85/100 (HOT)`, `Wants to visit Saturday`,
`https://www.dreaamzarrowhomes.com/admin`. Staff WhatsApp alerts start working once this template is approved and the staff member's number
and "WhatsApp" alert box are set in /admin → Team.

## 6. Vercel

**Project → Settings → Environment Variables** (Production, and Preview for testing). See `.env.example`
for the full list:

`META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_BUSINESS_ACCOUNT_ID`, `META_APP_SECRET`,
`META_WEBHOOK_VERIFY_TOKEN`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET` (long random string),
plus `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, `ENQUIRY_TO_EMAIL` for email.

Redeploy after adding them (`NEXT_PUBLIC_*` values are built into the page). `vercel.json` registers
the daily follow-up job; on the Hobby plan crons run once a day, so a "24-hour" follow-up goes out
24–48 hours after the customer went quiet. Upgrading to Pro allows an hourly schedule (`"0 * * * *"`).

## 7. Test with Meta's test number (before going live)

Use `/admin → AI test` first (no WhatsApp needed, nothing is sent or saved), then real messages:

| # | Test | Expected |
| --- | --- | --- |
| 1–2 | Submit the contact form with **your** number and the WhatsApp box ticked | Lead appears in /admin; welcome template arrives |
| 3–7 | Reply "Looking to rent a 3BHK in Kokapet under 80k, need it now" | AI asks one question at a time, saves budget/location, sends listing photo + link |
| 8 | Ask for a plot in Shamshabad | Says nothing matches; offers a consultant |
| 9–10 | Give budget + location + "this month" | Lead turns 🔥 HOT; team email + WhatsApp alert |
| 11–12 | "Can I visit on Saturday?" | Handover message; lead shows *Waiting for a consultant*; AI goes silent |
| — | Reply from /admin, then **Hand back to AI** | Your message delivered; AI resumes on next customer message |
| 13 | Send STOP | Unsubscribed confirmation; no further automation; START re-subscribes |
| 14 | Leave a lead silent; call `/api/followups/process` with `Authorization: Bearer $CRON_SECRET` after 24h | One follow-up template; no duplicate on re-run |
| 15 | Meta retries a webhook | No duplicate reply (automated test covers this) |
| 16 | Browse the website | All pages unchanged; form without the box ticked works as before |

Check **Vercel → Logs** for lines starting `[webhook]`, `[conversation]`, `[notify]`, `[followups]`.

## 8. Going live on +91 88869 13334 (keeping the WhatsApp Business app)

You chose **coexistence**: the same number works in the WhatsApp Business app on the phone *and* through
the Cloud API. Things to confirm with Meta before switching (I could not verify the current eligibility
rules — country, app version and onboarding path — in Meta's documentation; check
[Onboard WhatsApp Business app users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)):

- Coexistence onboarding is done through Meta's **Embedded Signup** flow ("connect your existing
  WhatsApp Business app"), which is typically offered by a Meta Business Partner / Tech Provider. If your
  app can't offer it directly, a partner can onboard the number for you.
- Keep the WhatsApp Business app updated and the phone active.
- Subscribe the webhook to **smb_message_echoes**. When anyone replies from the phone app, the website
  records it in the conversation and **automatically pauses the AI** for that customer, so a person and
  the AI never answer at the same time. Use **Hand back to AI** in /admin to resume.
- Complete **business verification** in Meta Business Settings for higher messaging limits and the display name.
- Template (business-initiated) messages are charged by Meta per message; replies within the customer's
  24-hour window are free. Check current India rates in WhatsApp Manager.

After switching: repeat tests 1–3 and 11–13 on the real number, then set `META_PHONE_NUMBER_ID` to the
production number and redeploy.

## 9. Day-to-day

- **Take over a chat:** open the lead → *Take over chat* (or just reply in /admin or from the phone app).
- **Pause the AI everywhere:** set `AI_ASSISTANT_ENABLED=false` and redeploy; new messages go to staff.
- **Sold or rented a home:** /admin → Listings → set availability. New listings: add to `properties.json` as today.
- **Opt-outs** are permanent until the customer sends START or ticks the box on a new enquiry.
- Pending calls / site visits created by handovers appear in **Follow-ups**.

## 10. Known limitations

- Follow-ups run once a day on the Hobby plan (see §6).
- The enquiry rate limit is per server instance (best effort), as before.
- No brochures or floor plans are published on the site, so the AI offers a consultant instead.
- Templates are English; the AI replies in English, Telugu or Hindi once the customer writes.
- The AI cannot listen to voice notes or see photos; it acknowledges them and continues in text.
