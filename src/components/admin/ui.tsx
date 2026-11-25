"use client";

import type { ReactNode } from "react";

export const btn = (variant: "primary" | "secondary" | "ghost" | "danger" = "secondary", extra = "") =>
  [
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[0.85rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-ink text-ivory hover:bg-ink-soft",
    variant === "secondary" && "border border-line bg-paper text-ink hover:border-ink",
    variant === "ghost" && "text-muted hover:bg-sand hover:text-ink",
    variant === "danger" && "border border-danger/40 bg-paper text-danger hover:bg-danger/5",
    extra,
  ]
    .filter(Boolean)
    .join(" ");

export const input = "w-full rounded-md border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-ink";

export function CategoryBadge({ category, score }: { category: string; score?: number }) {
  const cls =
    category === "hot"
      ? "bg-danger/10 text-danger border-danger/30"
      : category === "warm"
        ? "bg-brass-light/15 text-brass border-brass-light/40"
        : category === "cold"
          ? "bg-sand text-muted border-line"
          : "bg-paper text-muted border-line";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.72rem] font-bold uppercase tracking-wide ${cls}`}>
      {category === "hot" ? "🔥 " : ""}
      {category}
      {score !== undefined ? <span className="font-semibold opacity-80">· {score}</span> : null}
    </span>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-paper p-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h3 className="text-[0.95rem] font-bold text-ink">{title}</h3> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[0.8rem] font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[0.85rem] text-danger">{error}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[0.9rem] text-muted">{children}</p>;
}
