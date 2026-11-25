"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { LoaderCircle, LogOut } from "lucide-react";
import { api, supabaseBrowser, type StaffMember } from "./api";
import { btn, ErrorText, Field, input } from "./ui";
import { LeadsView } from "./leads-view";
import { FollowupsView, ListingsView, OverviewView, PlaygroundView, TeamView } from "./other-views";

type Me = {
  staff: Pick<StaffMember, "id" | "full_name" | "email" | "role">;
  integrations: Record<"whatsapp" | "webhookSignature" | "ai" | "email" | "cron", boolean>;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "leads", label: "Leads" },
  { id: "followups", label: "Follow-ups" },
  { id: "listings", label: "Listings", owner: true },
  { id: "team", label: "Team", owner: true },
  { id: "playground", label: "AI test" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Hash routing: #leads, #lead=<id>, #followups … so links in alert emails open the right lead. */
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
export function useHash() {
  return useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
}
export const go = (hash: string) => {
  window.location.hash = hash;
};

export function AdminApp() {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  if (!sb) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-lg border border-line bg-paper p-6">
          <h1 className="text-xl font-bold">Dashboard not configured</h1>
          <p className="mt-2 text-muted">
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel and redeploy. See
            docs/WHATSAPP-AUTOMATION.md.
          </p>
        </div>
      </Shell>
    );
  }
  if (session === undefined) return <Shell><Loading /></Shell>;
  if (!session) return <Shell><Login /></Shell>;
  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ivory px-4 py-10">{children}</div>;
}

function Loading() {
  return (
    <div className="flex justify-center py-16 text-muted">
      <LoaderCircle className="size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser()!.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-10 grid max-w-sm gap-4 rounded-lg border border-line bg-paper p-6 shadow-card">
      <div>
        <h1 className="font-display text-2xl">DreaamzArrow Homes</h1>
        <p className="text-[0.9rem] text-muted">Lead dashboard — staff sign-in</p>
      </div>
      <Field label="Email">
        <input className={input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password">
        <input className={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <ErrorText error={error} />
      <button className={btn("primary")} disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Sign in
      </button>
    </form>
  );
}

function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hash = useHash();

  const loadStaff = useCallback(async () => {
    const r = await api<{ staff: StaffMember[] }>("/api/admin/staff");
    setStaff(r.staff);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await api<Me>("/api/admin/me");
        if (!active) return;
        setMe(m);
        await loadStaff();
      } catch (e) {
        if (active) setError((e as Error).message === "forbidden" ? "Your account is not set up as staff. Ask an owner to add you." : (e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadStaff]);

  const signOut = () => supabaseBrowser()?.auth.signOut();

  if (error)
    return (
      <Shell>
        <div className="mx-auto grid max-w-md gap-4">
          <ErrorText error={error} />
          <button className={btn()} onClick={signOut}>Sign out</button>
        </div>
      </Shell>
    );
  if (!me) return <Shell><Loading /></Shell>;

  const isOwner = me.staff.role === "owner";
  const tabs = TABS.filter((t) => !("owner" in t) || isOwner);
  const leadId = hash.startsWith("lead=") ? hash.slice(5) : null;
  const tab: TabId = leadId ? "leads" : (tabs.find((t) => t.id === hash)?.id ?? "overview");
  const missing = Object.entries(me.integrations).filter(([, v]) => !v).map(([k]) => k);

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <a href="#overview" className="font-display text-lg">DreaamzArrow <span className="text-brass">Leads</span></a>
          <nav className="flex flex-wrap gap-1" aria-label="Dashboard sections">
            {tabs.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-[0.88rem] font-semibold ${tab === t.id ? "bg-ink text-ivory" : "text-muted hover:bg-sand hover:text-ink"}`}
              >
                {t.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[0.82rem] text-muted">
            <span>{me.staff.full_name} · {me.staff.role}</span>
            <button className={btn("ghost")} onClick={signOut} aria-label="Sign out"><LogOut className="size-4" /></button>
          </div>
        </div>
        {missing.length > 0 && (
          <p className="border-t border-line bg-sand px-4 py-1.5 text-center text-[0.78rem] text-muted">
            Not configured yet: {missing.join(", ")} — see docs/WHATSAPP-AUTOMATION.md
          </p>
        )}
      </header>
      <main className="mx-auto max-w-[90rem] px-4 py-6">
        {tab === "overview" && <OverviewView />}
        {tab === "leads" && <LeadsView staff={staff} leadId={leadId} meId={me.staff.id} />}
        {tab === "followups" && <FollowupsView staff={staff} />}
        {tab === "listings" && isOwner && <ListingsView />}
        {tab === "team" && isOwner && <TeamView staff={staff} reload={loadStaff} meId={me.staff.id} />}
        {tab === "playground" && <PlaygroundView />}
      </main>
    </div>
  );
}
