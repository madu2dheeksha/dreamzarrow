-- DreaamzArrow Homes — WhatsApp AI automation schema.
-- Run once in Supabase → SQL Editor (or `supabase db push`).
--
-- Security model: Row Level Security is ENABLED on every table with NO policies,
-- so the public anon key can read/write nothing. All access goes through the
-- Next.js server using the service-role key, after the server has checked who
-- the caller is (staff session for /api/admin/*, Meta signature for webhooks).

create extension if not exists pgcrypto;

-- ── Staff (admin dashboard users) ────────────────────────────────────────
create table if not exists public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'sales' check (role in ('owner', 'sales')),
  whatsapp_number text,                       -- digits incl. country code, e.g. 919876543210
  notify_whatsapp boolean not null default false,
  notify_email boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Leads ────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone_number text not null unique,          -- normalised WhatsApp id: digits incl. country code
  email text,
  enquiry_source text not null default 'website',
  enquiry_intent text,                        -- buy | rent | invest | list | site-visit | other | commercial
  property_interest text,                     -- listing the enquiry was made from, if any
  property_type text,                         -- apartment | villa | independent_house | plot | commercial | rental | investment
  budget text,                                -- as the customer said it, e.g. "1.5 – 2 Cr"
  budget_min numeric,
  budget_max numeric,
  preferred_location text,
  configuration text,                         -- e.g. "3 BHK"
  furnishing text,
  possession text,                            -- ready_to_move | under_construction | any
  buying_timeline text,                       -- immediate | 1_3_months | 3_6_months | exploring
  customer_requirements text,
  preferred_callback_time text,
  language text,
  lead_status text not null default 'new' check (lead_status in (
    'new', 'contacted', 'qualified', 'site_visit_requested', 'site_visit_scheduled',
    'negotiation', 'converted', 'lost', 'opted_out', 'human_handover')),
  lead_category text not null default 'new' check (lead_category in ('new', 'hot', 'warm', 'cold')),
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  score_signals jsonb not null default '{}'::jsonb,
  ai_summary text,
  ai_summary_at timestamptz,
  assigned_salesperson uuid references public.staff (id) on delete set null,
  -- Human handover: while true the AI never replies to this customer.
  human_handover boolean not null default false,
  handover_reason text,
  handover_at timestamptz,
  hot_notified_at timestamptz,
  -- WhatsApp consent (opt-in recorded from the website form).
  whatsapp_consent boolean not null default false,
  consent_at timestamptz,
  consent_text text,
  consent_source text,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  welcome_sent_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  -- Automatic follow-ups: stage 0..3 within the current silence; reset when the customer replies.
  followup_stage integer not null default 0 check (followup_stage between 0 and 3),
  silence_started_at timestamptz,
  enquiry_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_category_idx on public.leads (lead_category);
create index if not exists leads_status_idx on public.leads (lead_status);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_followup_idx on public.leads (followup_stage, silence_started_at)
  where opted_out = false and human_handover = false;

-- Every form submission (a lead can enquire several times). submission_id makes retries idempotent.
create table if not exists public.lead_enquiries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  submission_id text not null unique,
  intent text,
  property text,
  preferred_date date,
  message text,
  page text,
  whatsapp_consent boolean not null default false,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists lead_enquiries_lead_idx on public.lead_enquiries (lead_id, created_at desc);

-- ── Conversations (every WhatsApp message, both directions) ─────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  whatsapp_message_id text unique,
  message_direction text not null check (message_direction in ('inbound', 'outbound')),
  sender text not null check (sender in ('customer', 'ai', 'staff', 'system')),
  message_content text,
  message_type text not null default 'text',  -- text | template | image | interactive | button | document | audio | location | …
  template_name text,
  staff_id uuid references public.staff (id) on delete set null,
  delivery_status text not null default 'sent' check (delivery_status in (
    'pending', 'sent', 'delivered', 'read', 'failed', 'received')),
  error text,
  "timestamp" timestamptz not null default now()
);
create index if not exists conversations_lead_idx on public.conversations (lead_id, "timestamp");

-- ── Follow-ups (automatic sends + manual reminders) ─────────────────────
create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  followup_date timestamptz not null,
  followup_type text not null check (followup_type in ('auto_1', 'auto_2', 'auto_3', 'call', 'whatsapp', 'site_visit', 'other')),
  followup_status text not null default 'pending' check (followup_status in ('pending', 'sent', 'done', 'skipped', 'cancelled', 'failed')),
  notes text,
  created_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists followups_due_idx on public.followups (followup_status, followup_date);
create index if not exists followups_lead_idx on public.followups (lead_id);

-- Internal notes from staff.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_id uuid references public.staff (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ── Properties ───────────────────────────────────────────────────────────
-- Listing details stay in the website's src/content/properties.json (single source of truth).
-- This table only stores what the website file cannot: live availability set by staff.
create table if not exists public.property_status (
  slug text primary key,                      -- matches properties.json "slug"
  availability text not null default 'available' check (availability in ('available', 'under_offer', 'sold', 'rented', 'hidden')),
  notes text,
  updated_by uuid references public.staff (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Webhook de-duplication (Meta retries deliveries) ─────────────────────
create table if not exists public.webhook_events (
  id text primary key,                        -- message id, or status id + status
  received_at timestamptz not null default now()
);

-- ── updated_at trigger ───────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- Atomically claim the next automatic follow-up stage so two cron runs can never send the same one.
create or replace function public.claim_followup_stage(p_lead_id uuid, p_expected_stage integer)
returns boolean language plpgsql as $$
declare
  updated integer;
begin
  update public.leads
     set followup_stage = p_expected_stage + 1
   where id = p_lead_id
     and followup_stage = p_expected_stage
     and opted_out = false
     and human_handover = false;
  get diagnostics updated = row_count;
  return updated = 1;
end $$;

-- Lock everything down: no anon/authenticated access at all.
alter table public.staff enable row level security;
alter table public.leads enable row level security;
alter table public.lead_enquiries enable row level security;
alter table public.conversations enable row level security;
alter table public.followups enable row level security;
alter table public.lead_notes enable row level security;
alter table public.property_status enable row level security;
alter table public.webhook_events enable row level security;

revoke execute on function public.claim_followup_stage(uuid, integer) from public, anon, authenticated;

-- Housekeeping: keep webhook ids for 30 days.
-- (Run manually or via pg_cron: delete from public.webhook_events where received_at < now() - interval '30 days';)
