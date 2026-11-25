// In-memory stand-in for the subset of supabase-js used by the app, mirroring the SQL schema's
// defaults and unique constraints, so the real application code can be exercised end to end.
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
const now = () => new Date().toISOString();

const DEFAULTS: Record<string, () => Row> = {
  leads: () => ({
    id: randomUUID(), email: null, enquiry_source: "website", enquiry_intent: null, property_interest: null, property_type: null,
    budget: null, budget_min: null, budget_max: null, preferred_location: null, configuration: null, furnishing: null, possession: null,
    buying_timeline: null, customer_requirements: null, preferred_callback_time: null, language: null, lead_status: "new",
    lead_category: "new", lead_score: 0, score_signals: {}, ai_summary: null, ai_summary_at: null, assigned_salesperson: null,
    human_handover: false, handover_reason: null, handover_at: null, hot_notified_at: null, whatsapp_consent: false, consent_at: null,
    consent_text: null, consent_source: null, opted_out: false, opted_out_at: null, welcome_sent_at: null, last_inbound_at: null,
    last_outbound_at: null, followup_stage: 0, silence_started_at: null, enquiry_count: 1, created_at: now(), updated_at: now(),
  }),
  lead_enquiries: () => ({ id: randomUUID(), created_at: now(), whatsapp_consent: false }),
  conversations: () => ({ id: randomUUID(), message_type: "text", delivery_status: "sent", error: null, template_name: null, staff_id: null, whatsapp_message_id: null, timestamp: now() }),
  followups: () => ({ id: randomUUID(), followup_status: "pending", notes: null, created_by: null, created_at: now(), completed_at: null }),
  lead_notes: () => ({ id: randomUUID(), created_at: now() }),
  staff: () => ({ role: "sales", whatsapp_number: null, notify_whatsapp: false, notify_email: true, active: true, created_at: now() }),
  property_status: () => ({ availability: "available", notes: null, updated_at: now() }),
  webhook_events: () => ({ received_at: now() }),
};
const UNIQUE: Record<string, string[]> = {
  leads: ["id", "phone_number"],
  lead_enquiries: ["id", "submission_id"],
  conversations: ["id", "whatsapp_message_id"],
  followups: ["id"],
  lead_notes: ["id"],
  staff: ["id"],
  property_status: ["slug"],
  webhook_events: ["id"],
};

export class FakeDb {
  tables: Record<string, Row[]> = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, []]));
  users: Row[] = [];
  tokens = new Map<string, string>(); // token -> user id

  from(table: string) {
    return new Query(this, table);
  }
  async rpc(name: string, args: Row) {
    if (name !== "claim_followup_stage") return { data: null, error: { message: "unknown rpc" } };
    const lead = this.tables.leads.find((l) => l.id === args.p_lead_id);
    if (lead && lead.followup_stage === args.p_expected_stage && !lead.opted_out && !lead.human_handover) {
      lead.followup_stage++;
      return { data: true, error: null };
    }
    return { data: false, error: null };
  }
  auth = {
    getUser: async (token: string) => {
      const id = this.tokens.get(token);
      const user = this.users.find((u) => u.id === id);
      return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "invalid token" } };
    },
    admin: {
      createUser: async ({ email }: { email: string }) => {
        if (this.users.some((u) => u.email === email)) return { data: { user: null }, error: { message: "already registered" } };
        const user = { id: randomUUID(), email };
        this.users.push(user);
        return { data: { user }, error: null };
      },
      deleteUser: async (id: string) => {
        this.users = this.users.filter((u) => u.id !== id);
        return { error: null };
      },
    },
  };
}

class Query implements PromiseLike<any> {
  private filters: ((r: Row) => boolean)[] = [];
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private payload: any;
  private wantRows = false;
  private countMode = false;
  private head = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private lim: number | null = null;
  private rng: [number, number] | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  constructor(private db: FakeDb, private table: string) {}

  select(_cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.wantRows = true;
    else this.wantRows = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] != null && r[c] < v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] != null && r[c] <= v); return this; }
  gt(c: string, v: any) { this.filters.push((r) => r[c] != null && r[c] > v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] != null && r[c] >= v); return this; }
  is(c: string, v: null) { this.filters.push((r) => r[c] == v); return this; }
  like(c: string, p: string) { const re = new RegExp(`^${p.replace(/%/g, ".*").replace(/_/g, ".")}$`); this.filters.push((r) => re.test(String(r[c] ?? ""))); return this; }
  ilike(c: string, p: string) { const re = new RegExp(`^${p.replace(/%/g, ".*")}$`, "i"); this.filters.push((r) => re.test(String(r[c] ?? ""))); return this; }
  not(c: string, op: string, v: any) {
    if (op === "is") this.filters.push((r) => r[c] != v);
    else if (op === "in") { const list = String(v).replace(/[()]/g, "").split(","); this.filters.push((r) => !list.includes(r[c])); }
    return this;
  }
  or(expr: string) {
    const parts = expr.split(",").map((p) => { const [col, , pat] = p.split("."); return { col, re: new RegExp(`^${pat.replace(/%/g, ".*")}$`, "i") }; });
    this.filters.push((r) => parts.some((p) => p.re.test(String(r[p.col] ?? ""))));
    return this;
  }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending ?? true }; return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.rng = [a, b]; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  private exec() {
    const rows = this.db.tables[this.table];
    const clone = (r: Row) => JSON.parse(JSON.stringify(r));
    let out: Row[] = [];
    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const item of items) {
        const row = { ...DEFAULTS[this.table](), ...item };
        const existing = UNIQUE[this.table].map((k) => (row[k] == null ? undefined : rows.find((r) => r[k] === row[k]))).find(Boolean);
        if (existing) {
          if (this.op === "upsert") { Object.assign(existing, item); out.push(existing); continue; }
          return { data: null, error: { code: "23505", message: `duplicate key in ${this.table}` }, count: null };
        }
        rows.push(row);
        out.push(row);
      }
    } else {
      out = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") {
        for (const r of out) { Object.assign(r, this.payload); if (this.table === "leads") r.updated_at = now(); }
      }
    }
    if (this.orderBy) { const { col, asc } = this.orderBy; out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)); }
    const count = out.length;
    if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim != null) out = out.slice(0, this.lim);
    const data = this.head ? null : out.map(clone);
    if (this.mode === "single") return data && data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116", message: `expected 1 row, got ${data?.length}` } };
    if (this.mode === "maybe") return { data: data?.[0] ?? null, error: null };
    return { data: this.op !== "select" && !this.wantRows ? null : data, error: null, count: this.countMode ? count : null };
  }
  then<T>(res: (v: any) => T, rej?: (e: any) => T) {
    try { return Promise.resolve(this.exec()).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); }
  }
}
