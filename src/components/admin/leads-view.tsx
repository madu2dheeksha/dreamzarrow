"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bot, Check, CheckCheck, Download, MessageCircle, RefreshCw, Send, TriangleAlert, UserRound } from "lucide-react";
import {
  api,
  downloadCsv,
  fmtDate,
  fmtPhone,
  STATUS_LABEL,
  TIMELINE_LABEL,
  type Followup,
  type LeadRow,
  type Message,
  type Note,
  type StaffMember,
} from "./api";
import { btn, Card, CategoryBadge, Empty, ErrorText, Field, input } from "./ui";
import { go } from "./admin-app";

type Filters = { q: string; category: string; status: string; location: string; minBudget: string; maxBudget: string; assigned: string; handover: string };
const EMPTY: Filters = { q: "", category: "", status: "", location: "", minBudget: "", maxBudget: "", assigned: "", handover: "" };

const toParams = (f: Filters, page = 0) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  if (page) p.set("page", String(page));
  return p.toString();
};

export function LeadsView({ staff, leadId, meId }: { staff: StaffMember[]; leadId: string | null; meId: string }) {
  if (leadId) return <LeadDetail id={leadId} staff={staff} meId={meId} />;
  return <LeadList staff={staff} />;
}

function LeadList({ staff }: { staff: StaffMember[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ leads: LeadRow[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      api<{ leads: LeadRow[]; total: number; pageSize: number }>(`/api/admin/leads?${toParams(applied, page)}`)
        .then((r) => active && (setData(r), setError(null)))
        .catch((e) => active && setError(e.message));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [applied, page]);

  const set = (k: keyof Filters) => (e: { target: { value: string } }) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(0);
    setApplied(filters);
  };
  const name = (id: string | null) => staff.find((s) => s.id === id)?.full_name ?? "—";

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Field label="Search"><input className={input} value={filters.q} onChange={set("q")} placeholder="Name, phone, email…" /></Field>
        <Field label="Category">
          <select className={input} value={filters.category} onChange={set("category")}>
            <option value="">All</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option><option value="new">New</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={input} value={filters.status} onChange={set("status")}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Location"><input className={input} value={filters.location} onChange={set("location")} placeholder="e.g. Kokapet" /></Field>
        <Field label="Budget from (₹)"><input className={input} inputMode="numeric" value={filters.minBudget} onChange={set("minBudget")} placeholder="5000000" /></Field>
        <Field label="Budget up to (₹)"><input className={input} inputMode="numeric" value={filters.maxBudget} onChange={set("maxBudget")} placeholder="20000000" /></Field>
        <Field label="Assigned to">
          <select className={input} value={filters.assigned} onChange={set("assigned")}>
            <option value="">Anyone</option><option value="none">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </Field>
        <Field label="Chat">
          <select className={input} value={filters.handover} onChange={set("handover")}>
            <option value="">All</option><option value="1">With a human</option>
          </select>
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
          <button className={btn("primary")}>Apply filters</button>
          <button type="button" className={btn()} onClick={() => { setFilters(EMPTY); setApplied(EMPTY); setPage(0); }}>Reset</button>
          <button type="button" className={btn("secondary", "ml-auto")} onClick={() => downloadCsv(`/api/admin/leads/export?${toParams(applied)}`).catch((e) => setError(e.message))}>
            <Download className="size-4" /> Export CSV
          </button>
        </div>
      </form>
      <ErrorText error={error} />
      <div className="overflow-x-auto rounded-lg border border-line bg-paper">
        <table className="w-full min-w-[60rem] text-left text-[0.86rem]">
          <thead className="border-b border-line bg-sand/60 text-[0.75rem] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Customer</th><th className="px-3 py-2">Lead</th><th className="px-3 py-2">Looking for</th>
              <th className="px-3 py-2">Budget</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Timeline</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {data?.leads.map((l) => (
              <tr key={l.id} onClick={() => go(`lead=${l.id}`)} className="cursor-pointer border-b border-line/70 hover:bg-sand/40">
                <td className="px-3 py-2">
                  <a href={`#lead=${l.id}`} className="font-semibold text-ink hover:underline">{l.customer_name}</a>
                  <div className="text-[0.78rem] text-muted">{fmtPhone(l.phone_number)}</div>
                </td>
                <td className="px-3 py-2"><CategoryBadge category={l.lead_category} score={l.lead_score} /></td>
                <td className="px-3 py-2">{[l.enquiry_intent, l.property_type, l.configuration].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2">{l.budget ?? "—"}</td>
                <td className="px-3 py-2">{l.preferred_location ?? "—"}</td>
                <td className="px-3 py-2">{l.buying_timeline ? TIMELINE_LABEL[l.buying_timeline] ?? l.buying_timeline : "—"}</td>
                <td className="px-3 py-2">
                  {STATUS_LABEL[l.lead_status] ?? l.lead_status}
                  {l.human_handover && <span className="ml-1 text-[0.75rem] text-brass">· human</span>}
                  {l.opted_out && <span className="ml-1 text-[0.75rem] text-danger">· opted out</span>}
                </td>
                <td className="px-3 py-2">{name(l.assigned_salesperson)}</td>
                <td className="px-3 py-2 text-muted">{fmtDate(l.last_inbound_at ?? l.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.leads.length === 0 && <Empty>No leads match these filters yet.</Empty>}
        {!data && !error && <Empty>Loading…</Empty>}
      </div>
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-end gap-2 text-[0.85rem] text-muted">
          <span>{page * data.pageSize + 1}–{Math.min((page + 1) * data.pageSize, data.total)} of {data.total}</span>
          <button className={btn()} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <button className={btn()} disabled={(page + 1) * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

type Detail = {
  lead: LeadRow;
  canSendFreeform: boolean;
  messages: Message[];
  notes: Note[];
  followups: Followup[];
  enquiries: { id: string; intent: string; property: string | null; preferred_date: string | null; message: string | null; page: string | null; whatsapp_consent: boolean; created_at: string }[];
};

function LeadDetail({ id, staff, meId }: { id: string; staff: StaffMember[]; meId: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setD(await api<Detail>(`/api/admin/leads/${id}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    const tick = () => active && load();
    tick();
    const t = setInterval(tick, 15_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [load]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!d) return <div className="grid gap-3"><BackLink /><ErrorText error={error} />{!error && <Empty>Loading…</Empty>}</div>;
  const l = d.lead;
  const patch = (body: Record<string, unknown>) => act("patch", () => api(`/api/admin/leads/${id}`, { method: "PATCH", json: body }));
  const signals = Object.entries(l.score_signals ?? {}).filter(([, v]) => v).map(([k]) => k.replace(/_/g, " "));

  return (
    <div className="grid gap-4">
      <BackLink />
      <ErrorText error={error} />
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-line bg-paper p-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl">{l.customer_name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-[0.9rem] text-muted">
            <a className="font-semibold text-ink underline underline-offset-2" href={`tel:+${l.phone_number}`}>{fmtPhone(l.phone_number)}</a>
            <a className="inline-flex items-center gap-1 underline underline-offset-2" href={`https://wa.me/${l.phone_number}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" />WhatsApp</a>
            {l.email && <a className="underline underline-offset-2" href={`mailto:${l.email}`}>{l.email}</a>}
            <span>Source: {l.enquiry_source}</span>
            <span>Since {fmtDate(l.created_at)}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryBadge category={l.lead_category} score={l.lead_score} />
            {signals.map((s) => <span key={s} className="rounded-full bg-sand px-2 py-0.5 text-[0.72rem] text-muted">{s}</span>)}
            {l.opted_out && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[0.72rem] font-bold text-danger">OPTED OUT</span>}
            {!l.whatsapp_consent && !l.last_inbound_at && <span className="rounded-full bg-sand px-2 py-0.5 text-[0.72rem] text-muted">No WhatsApp consent</span>}
          </div>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
          <Field label="Status">
            <select className={input} value={l.lead_status} disabled={busy !== null} onChange={(e) => patch({ lead_status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
            </select>
          </Field>
          <Field label="Category (override)">
            <select className={input} value={l.lead_category} disabled={busy !== null} onChange={(e) => patch({ lead_category: e.target.value })}>
              {["hot", "warm", "cold", "new"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Assigned to">
            <select className={input} value={l.assigned_salesperson ?? ""} disabled={busy !== null} onChange={(e) => patch({ assigned_salesperson: e.target.value || null })}>
              <option value="">Unassigned</option>
              {staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Conversation detail={d} busy={busy} act={act} meId={meId} />
        <div className="grid content-start gap-4">
          <Card
            title="AI summary"
            actions={<button className={btn("ghost")} disabled={busy !== null} onClick={() => act("summary", () => api(`/api/admin/leads/${id}/summary`, { method: "POST" }))}><RefreshCw className={`size-4 ${busy === "summary" ? "animate-spin" : ""}`} /> Refresh</button>}
          >
            <p className="whitespace-pre-wrap text-[0.9rem]">{l.ai_summary ?? "No summary yet."}</p>
            {l.ai_summary_at && <p className="mt-2 text-[0.75rem] text-muted">Updated {fmtDate(l.ai_summary_at)}</p>}
            {l.handover_reason && <p className="mt-3 rounded-md bg-sand px-3 py-2 text-[0.85rem]"><strong>Handover:</strong> {l.handover_reason}</p>}
          </Card>
          <ProfileCard lead={l} busy={busy} save={patch} />
          <NotesCard id={id} notes={d.notes} staff={staff} act={act} busy={busy} />
          <FollowupsCard id={id} followups={d.followups} act={act} busy={busy} />
          <Card title="Website enquiries">
            {d.enquiries.length === 0 ? <Empty>None — this customer messaged on WhatsApp first.</Empty> : (
              <ul className="grid gap-2 text-[0.85rem]">
                {d.enquiries.map((e) => (
                  <li key={e.id} className="rounded-md border border-line p-2">
                    <div className="flex justify-between gap-2 text-muted"><span>{e.intent}{e.property ? ` · ${e.property}` : ""}</span><span>{fmtDate(e.created_at)}</span></div>
                    {e.message && <p className="mt-1 whitespace-pre-wrap">{e.message}</p>}
                    <p className="mt-1 text-[0.75rem] text-muted">{e.preferred_date ? `Visit date: ${e.preferred_date} · ` : ""}{e.page ?? ""} · WhatsApp consent: {e.whatsapp_consent ? "yes" : "no"}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return <a href="#leads" className="inline-flex items-center gap-1 text-[0.88rem] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> All leads</a>;
}

function Tick({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="size-3.5 text-[#34B7F1]" aria-label="Read" />;
  if (status === "delivered") return <CheckCheck className="size-3.5" aria-label="Delivered" />;
  if (status === "sent") return <Check className="size-3.5" aria-label="Sent" />;
  if (status === "failed") return <TriangleAlert className="size-3.5 text-danger" aria-label="Failed" />;
  return null;
}

function Conversation({ detail, busy, act, meId }: { detail: Detail; busy: string | null; act: (l: string, f: () => Promise<unknown>) => Promise<void>; meId: string }) {
  const l = detail.lead;
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const count = detail.messages.length;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    act("send", async () => {
      await api("/api/whatsapp/send", { method: "POST", json: { leadId: l.id, text: body } });
      setText("");
    });
  };

  return (
    <Card
      title="WhatsApp conversation"
      actions={
        l.human_handover ? (
          <button className={btn("secondary")} disabled={busy !== null || l.opted_out} onClick={() => act("resume", () => api("/api/admin/handover", { method: "POST", json: { leadId: l.id, action: "resume" } }))}>
            <Bot className="size-4" /> Hand back to AI
          </button>
        ) : (
          <button className={btn("primary")} disabled={busy !== null} onClick={() => act("takeover", () => api("/api/admin/handover", { method: "POST", json: { leadId: l.id, action: "takeover" } }))}>
            <UserRound className="size-4" /> Take over chat
          </button>
        )
      }
    >
      <p className={`mb-3 rounded-md px-3 py-2 text-[0.82rem] ${l.human_handover ? "bg-brass-light/15 text-brass" : "bg-success/10 text-success"}`}>
        {l.human_handover ? "A person is handling this chat — the AI assistant is paused." : "The AI assistant is replying to this customer."}
      </p>
      <div className="grid max-h-[32rem] gap-2 overflow-y-auto rounded-md bg-[#efe7dc] p-3">
        {detail.messages.length === 0 && <Empty>No messages yet.</Empty>}
        {detail.messages.map((m) => {
          const out = m.message_direction === "outbound";
          return (
            <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-[0.88rem] shadow-sm ${out ? "ml-auto bg-[#d9fdd3]" : "bg-white"}`}>
              <div className="mb-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                {m.sender === "customer" ? l.customer_name : m.sender === "ai" ? "AI assistant" : m.sender === "staff" ? (m.staff_id === meId ? "You" : "Consultant") : m.template_name ? `Template · ${m.template_name}` : "System"}
              </div>
              <p className="whitespace-pre-wrap break-words">{m.message_content}</p>
              <div className="mt-1 flex items-center justify-end gap-1 text-[0.7rem] text-muted">
                {fmtDate(m.timestamp)} {out && <Tick status={m.delivery_status} />}
              </div>
              {m.error && <p className="mt-1 text-[0.72rem] text-danger">{m.error}</p>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {l.opted_out ? (
        <p className="mt-3 text-[0.85rem] text-danger">This customer opted out. Do not message them on WhatsApp.</p>
      ) : detail.canSendFreeform ? (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <textarea className={`${input} min-h-11 flex-1 resize-y`} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as a consultant (the AI pauses automatically)…" maxLength={4000} />
          <button className={btn("primary")} disabled={busy !== null || !text.trim()}><Send className="size-4" /> Send</button>
        </form>
      ) : (
        <p className="mt-3 text-[0.82rem] text-muted">
          WhatsApp only allows free-form replies within 24 hours of the customer&apos;s last message. Call the customer, or wait for them to reply.
        </p>
      )}
    </Card>
  );
}

function ProfileCard({ lead, busy, save }: { lead: LeadRow; busy: string | null; save: (b: Record<string, unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ budget: "", preferred_location: "", configuration: "", property_type: "", buying_timeline: "", preferred_callback_time: "" });
  const rows: [string, string | null | undefined][] = [
    ["Looking to", lead.enquiry_intent],
    ["Enquired about", lead.property_interest],
    ["Property type", lead.property_type],
    ["Configuration", lead.configuration],
    ["Budget", lead.budget],
    ["Location", lead.preferred_location],
    ["Furnishing", lead.furnishing],
    ["Possession", lead.possession],
    ["Timeline", lead.buying_timeline ? TIMELINE_LABEL[lead.buying_timeline] ?? lead.buying_timeline : null],
    ["Callback time", lead.preferred_callback_time],
    ["Language", lead.language],
    ["Requirements", lead.customer_requirements],
  ];
  const startEdit = () => {
    setForm({
      budget: lead.budget ?? "",
      preferred_location: lead.preferred_location ?? "",
      configuration: lead.configuration ?? "",
      property_type: lead.property_type ?? "",
      buying_timeline: lead.buying_timeline ?? "",
      preferred_callback_time: lead.preferred_callback_time ?? "",
    });
    setEditing(true);
  };
  if (editing) {
    const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
    return (
      <Card title="Requirements">
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await save(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null])));
            setEditing(false);
          }}
        >
          <Field label="Budget"><input className={input} value={form.budget} onChange={set("budget")} /></Field>
          <Field label="Location"><input className={input} value={form.preferred_location} onChange={set("preferred_location")} /></Field>
          <Field label="Configuration"><input className={input} value={form.configuration} onChange={set("configuration")} /></Field>
          <Field label="Property type"><input className={input} value={form.property_type} onChange={set("property_type")} /></Field>
          <Field label="Timeline">
            <select className={input} value={form.buying_timeline} onChange={set("buying_timeline")}>
              <option value="">—</option>
              {Object.entries(TIMELINE_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Field>
          <Field label="Callback time"><input className={input} value={form.preferred_callback_time} onChange={set("preferred_callback_time")} /></Field>
          <div className="flex gap-2"><button className={btn("primary")} disabled={busy !== null}>Save</button><button type="button" className={btn()} onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      </Card>
    );
  }
  return (
    <Card title="Requirements" actions={<button className={btn("ghost")} onClick={startEdit}>Edit</button>}>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-[0.86rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="whitespace-pre-wrap break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function NotesCard({ id, notes, staff, act, busy }: { id: string; notes: Note[]; staff: StaffMember[]; act: (l: string, f: () => Promise<unknown>) => Promise<void>; busy: string | null }) {
  const [note, setNote] = useState("");
  return (
    <Card title="Internal notes">
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          act("note", async () => {
            await api(`/api/admin/leads/${id}/notes`, { method: "POST", json: { note } });
            setNote("");
          });
        }}
      >
        <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team…" maxLength={4000} />
        <button className={btn()} disabled={busy !== null || !note.trim()}>Add</button>
      </form>
      {notes.length === 0 ? <Empty>No notes yet.</Empty> : (
        <ul className="grid gap-2 text-[0.86rem]">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-line p-2">
              <p className="whitespace-pre-wrap">{n.note}</p>
              <p className="mt-1 text-[0.72rem] text-muted">{staff.find((s) => s.id === n.author_id)?.full_name ?? "Staff"} · {fmtDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FollowupsCard({ id, followups, act, busy }: { id: string; followups: Followup[]; act: (l: string, f: () => Promise<unknown>) => Promise<void>; busy: string | null }) {
  const [form, setForm] = useState({ date: "", type: "call", notes: "" });
  return (
    <Card title="Follow-ups">
      <form
        className="mb-3 grid gap-2 sm:grid-cols-[1fr_8rem]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.date) return;
          act("followup", async () => {
            await api(`/api/admin/leads/${id}/followups`, {
              method: "POST",
              json: { followup_date: new Date(form.date).toISOString(), followup_type: form.type, notes: form.notes || undefined },
            });
            setForm({ date: "", type: "call", notes: "" });
          });
        }}
      >
        <input className={input} type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} aria-label="Follow-up date and time" required />
        <select className={input} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} aria-label="Follow-up type">
          <option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="site_visit">Site visit</option><option value="other">Other</option>
        </select>
        <input className={`${input} sm:col-span-2`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
        <button className={btn("secondary", "sm:col-span-2")} disabled={busy !== null}>Schedule follow-up</button>
      </form>
      {followups.length === 0 ? <Empty>No follow-ups.</Empty> : (
        <ul className="grid gap-2 text-[0.85rem]">
          {followups.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-2 rounded-md border border-line p-2">
              <div>
                <p className="font-semibold">{f.followup_type.replace("_", " ")} · {fmtDate(f.followup_date)}</p>
                {f.notes && <p className="text-muted">{f.notes}</p>}
                <p className="text-[0.72rem] uppercase text-muted">{f.followup_status}</p>
              </div>
              {f.followup_status === "pending" && (
                <button className={btn("ghost")} disabled={busy !== null} onClick={() => act("fu", () => api(`/api/admin/followups/${f.id}`, { method: "PATCH", json: { followup_status: "done" } }))}>Done</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
