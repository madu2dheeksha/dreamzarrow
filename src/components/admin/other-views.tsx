"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { api, fmtDate, fmtPhone, type Followup, type LeadRow, type StaffMember } from "./api";
import { btn, Card, CategoryBadge, Empty, ErrorText, Field, input } from "./ui";

// ── Overview ─────────────────────────────────────────────────────────────

type Stats = { total: number; today: number; hot: number; warm: number; cold: number; siteVisits: number; converted: number; pendingFollowups: number; openHandovers: number };

export function OverviewView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [hot, setHot] = useState<LeadRow[]>([]);
  const [handovers, setHandovers] = useState<LeadRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [s, h, ho] = await Promise.all([
          api<Stats>("/api/admin/stats"),
          api<{ leads: LeadRow[] }>("/api/admin/leads?category=hot"),
          api<{ leads: LeadRow[] }>("/api/admin/leads?handover=1"),
        ]);
        if (!active) return;
        setStats(s);
        setHot(h.leads.slice(0, 8));
        setHandovers(ho.leads.filter((l) => !["converted", "lost", "opted_out"].includes(l.lead_status)).slice(0, 8));
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const tiles: [string, number | undefined, string][] = [
    ["Total enquiries", stats?.total, "#leads"],
    ["Today", stats?.today, "#leads"],
    ["Hot leads", stats?.hot, "#leads"],
    ["Warm leads", stats?.warm, "#leads"],
    ["Cold leads", stats?.cold, "#leads"],
    ["Site visits requested", stats?.siteVisits, "#leads"],
    ["Converted", stats?.converted, "#leads"],
    ["Pending follow-ups", stats?.pendingFollowups, "#followups"],
    ["Chats with a human", stats?.openHandovers, "#leads"],
  ];

  return (
    <div className="grid gap-4">
      <ErrorText error={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {tiles.map(([label, value, href]) => (
          <a key={label} href={href} className="rounded-lg border border-line bg-paper p-4 hover:border-ink">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl">{value ?? "—"}</p>
          </a>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LeadMiniList title="🔥 Hot leads" leads={hot} empty="No hot leads yet." />
        <LeadMiniList title="Waiting for a consultant" leads={handovers} empty="No chats are waiting for a person." showReason />
      </div>
    </div>
  );
}

function LeadMiniList({ title, leads, empty, showReason }: { title: string; leads: LeadRow[]; empty: string; showReason?: boolean }) {
  return (
    <Card title={title}>
      {leads.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="divide-y divide-line">
          {leads.map((l) => (
            <li key={l.id}>
              <a href={`#lead=${l.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-sand/40">
                <span>
                  <span className="font-semibold">{l.customer_name}</span>
                  <span className="block text-[0.8rem] text-muted">
                    {[l.configuration, l.preferred_location, l.budget].filter(Boolean).join(" · ") || fmtPhone(l.phone_number)}
                  </span>
                  {showReason && l.handover_reason && <span className="block text-[0.78rem] text-brass">{l.handover_reason}</span>}
                </span>
                <CategoryBadge category={l.lead_category} score={l.lead_score} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Follow-ups ───────────────────────────────────────────────────────────

export function FollowupsView({ staff }: { staff: StaffMember[] }) {
  const [items, setItems] = useState<Followup[] | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setItems((await api<{ followups: Followup[] }>("/api/admin/followups")).followups);
      setNow(Date.now());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api<{ followups: Followup[] }>("/api/admin/followups")
      .then((r) => active && (setItems(r.followups), setNow(Date.now())))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const update = async (id: string, followup_status: string) => {
    try {
      await api(`/api/admin/followups/${id}`, { method: "PATCH", json: { followup_status } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card title="Pending follow-ups">
      <p className="mb-3 text-[0.82rem] text-muted">
        Calls, site visits and handover tasks for the team. Automatic WhatsApp follow-ups (after 1, 3 and 7 days of silence) are sent by the daily job and logged on each lead.
      </p>
      <ErrorText error={error} />
      {!items ? <Empty>Loading…</Empty> : items.length === 0 ? <Empty>Nothing pending. 🎉</Empty> : (
        <ul className="divide-y divide-line">
          {items.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className={`w-36 text-[0.85rem] font-semibold ${new Date(f.followup_date).getTime() < now ? "text-danger" : ""}`}>{fmtDate(f.followup_date)}</span>
              <span className="rounded-full bg-sand px-2 py-0.5 text-[0.75rem]">{f.followup_type.replace("_", " ")}</span>
              <a href={`#lead=${f.lead_id}`} className="font-semibold underline underline-offset-2">{f.leads?.customer_name ?? "Lead"}</a>
              {f.leads && <CategoryBadge category={f.leads.lead_category} />}
              <span className="text-[0.8rem] text-muted">{staff.find((s) => s.id === f.leads?.assigned_salesperson)?.full_name ?? "Unassigned"}</span>
              <span className="min-w-0 flex-1 text-[0.85rem] text-muted">{f.notes}</span>
              <button className={btn()} onClick={() => update(f.id, "done")}>Done</button>
              <button className={btn("ghost")} onClick={() => update(f.id, "skipped")}>Skip</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Listings availability (owner) ────────────────────────────────────────

type ListingRow = { slug: string; title: string; locality: string; community: string | null; listing: string; price: string; availability: string; updated_at: string | null };

export function ListingsView() {
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api<{ properties: ListingRow[] }>("/api/admin/properties")
      .then((r) => active && setRows(r.properties))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const change = async (slug: string, availability: string) => {
    setSaving(slug);
    try {
      await api("/api/admin/properties", { method: "PATCH", json: { slug, availability } });
      setRows((r) => r?.map((x) => (x.slug === slug ? { ...x, availability } : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };
  return (
    <Card title="Listing availability">
      <p className="mb-3 text-[0.82rem] text-muted">
        The AI recommends only listings marked <strong>Available</strong> (or Under offer, with a note). Listing details and prices come from the website; edit them in
        src/content/properties.json.
      </p>
      <ErrorText error={error} />
      {!rows ? <Empty>Loading…</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-[0.86rem]">
            <thead className="text-[0.75rem] uppercase text-muted"><tr><th className="py-2">Listing</th><th>Area</th><th>Price</th><th>Availability</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-t border-line">
                  <td className="py-2 pr-3"><a className="font-semibold hover:underline" href={`/properties/${r.slug}`} target="_blank" rel="noopener noreferrer">{r.title}</a>{r.community && <span className="block text-[0.78rem] text-muted">{r.community}</span>}</td>
                  <td className="pr-3">{r.locality}</td>
                  <td className="pr-3">{r.price}</td>
                  <td>
                    <select className={input} value={r.availability} disabled={saving === r.slug} onChange={(e) => change(r.slug, e.target.value)} aria-label={`Availability of ${r.title}`}>
                      <option value="available">Available</option>
                      <option value="under_offer">Under offer</option>
                      <option value="sold">Sold</option>
                      <option value="rented">Rented</option>
                      <option value="hidden">Hidden from AI</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Team (owner) ─────────────────────────────────────────────────────────

export function TeamView({ staff, reload, meId }: { staff: StaffMember[]; reload: () => Promise<void>; meId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "sales", whatsapp_number: "", notify_whatsapp: false, notify_email: true });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/staff", { method: "POST", json: form });
      setForm({ full_name: "", email: "", password: "", role: "sales", whatsapp_number: "", notify_whatsapp: false, notify_email: true });
    });
  };
  const patch = (id: string, body: Record<string, unknown>) => run(() => api("/api/admin/staff", { method: "PATCH", json: { id, ...body } }));

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card title="Team">
        <ErrorText error={error} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[0.86rem]">
            <thead className="text-[0.75rem] uppercase text-muted"><tr><th className="py-2">Name</th><th>Role</th><th>WhatsApp</th><th>Alerts</th><th>Active</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="py-2 pr-3"><span className="font-semibold">{s.full_name}</span><span className="block text-[0.78rem] text-muted">{s.email}</span></td>
                  <td className="pr-3">
                    <select className={input} value={s.role} disabled={busy || s.id === meId} onChange={(e) => patch(s.id, { role: e.target.value })} aria-label="Role">
                      <option value="owner">Owner</option><option value="sales">Sales</option>
                    </select>
                  </td>
                  <td className="pr-3">{s.whatsapp_number ? fmtPhone(s.whatsapp_number) : "—"}</td>
                  <td className="pr-3">
                    <label className="mr-3 inline-flex items-center gap-1"><input type="checkbox" checked={s.notify_email} disabled={busy} onChange={(e) => patch(s.id, { notify_email: e.target.checked })} /> Email</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={s.notify_whatsapp} disabled={busy || !s.whatsapp_number} onChange={(e) => patch(s.id, { notify_whatsapp: e.target.checked })} /> WhatsApp</label>
                  </td>
                  <td><input type="checkbox" checked={s.active} disabled={busy || s.id === meId} onChange={(e) => patch(s.id, { active: e.target.checked })} aria-label="Active" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Add a team member">
        <form onSubmit={add} className="grid gap-3">
          <Field label="Full name"><input className={input} required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email (login)"><input className={input} type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Temporary password (min 10 characters)"><input className={input} type="text" minLength={10} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          <Field label="Role">
            <select className={input} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}><option value="sales">Sales</option><option value="owner">Owner</option></select>
          </Field>
          <Field label="WhatsApp number for alerts (optional)"><input className={input} placeholder="+91" value={form.whatsapp_number} onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-[0.85rem]"><input type="checkbox" checked={form.notify_whatsapp} onChange={(e) => setForm((f) => ({ ...f, notify_whatsapp: e.target.checked }))} /> Send hot-lead alerts on WhatsApp</label>
          <label className="flex items-center gap-2 text-[0.85rem]"><input type="checkbox" checked={form.notify_email} onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.checked }))} /> Send hot-lead alerts by email</label>
          <button className={btn("primary")} disabled={busy}>Add member</button>
          <p className="text-[0.78rem] text-muted">Share the password with them privately; they can change it later in Supabase.</p>
        </form>
      </Card>
    </div>
  );
}

// ── AI playground ────────────────────────────────────────────────────────

type PlayMsg = { from: "customer" | "assistant"; text: string };
type PlayResult = { reply: string | null; actions: string[]; shared: string[]; events: string[]; profile: Record<string, unknown>; score: number; category: string };

export function PlaygroundView() {
  const [msgs, setMsgs] = useState<PlayMsg[]>([]);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [signals, setSignals] = useState<Record<string, boolean>>({});
  const [last, setLast] = useState<PlayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const next = [...msgs, { from: "customer" as const, text: text.trim() }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const r = await api<PlayResult>("/api/ai/chat", { method: "POST", json: { messages: next, profile, signals } });
      setLast(r);
      const { score_signals, ...rest } = r.profile as { score_signals?: Record<string, boolean> };
      setProfile(rest);
      setSignals(score_signals ?? {});
      setMsgs([...next, ...r.shared.map((s) => ({ from: "assistant" as const, text: `[Photo] ${s}` })), ...(r.reply ? [{ from: "assistant" as const, text: r.reply }] : [])]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card title="Test the AI assistant (nothing is sent or saved)" actions={<button className={btn("ghost")} onClick={() => { setMsgs([]); setProfile({}); setSignals({}); setLast(null); }}>Reset</button>}>
        <div className="grid max-h-[32rem] min-h-64 gap-2 overflow-y-auto rounded-md bg-[#efe7dc] p-3">
          {msgs.length === 0 && <Empty>Type as if you were a customer, e.g. “Hi, I want a 3BHK in Kokapet for rent under 80k”.</Empty>}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[0.88rem] shadow-sm ${m.from === "assistant" ? "ml-auto bg-[#d9fdd3]" : "bg-white"}`}>{m.text}</div>
          ))}
          {busy && <LoaderCircle className="ml-auto size-5 animate-spin text-muted" />}
        </div>
        <ErrorText error={error} />
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message as the customer…" />
          <button className={btn("primary")} disabled={busy}><Send className="size-4" /> Send</button>
        </form>
      </Card>
      <Card title="What the AI did">
        {!last ? <Empty>Send a message to see tool calls, profile and score.</Empty> : (
          <div className="grid gap-3 text-[0.85rem]">
            <p><CategoryBadge category={last.category} score={last.score} /></p>
            {last.events.length > 0 && <p className="rounded-md bg-sand px-3 py-2 font-semibold">{last.events.join(" · ")}</p>}
            <div><p className="font-semibold">Tool calls</p><p className="text-muted">{last.actions.join(", ") || "none"}</p></div>
            <div>
              <p className="font-semibold">Captured profile</p>
              <pre className="mt-1 overflow-x-auto rounded-md bg-sand p-2 text-[0.75rem]">
                {JSON.stringify(Object.fromEntries(Object.entries(profile).filter(([k, v]) => v != null && !["id", "phone_number", "created_at", "updated_at", "consent_at", "welcome_sent_at", "last_inbound_at", "last_outbound_at", "enquiry_source", "lead_status", "lead_category", "lead_score", "whatsapp_consent", "opted_out", "human_handover", "followup_stage", "enquiry_count"].includes(k))), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
