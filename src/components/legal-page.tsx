import type { ReactNode } from "react";
import { Eyebrow } from "./ui";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <section className="pt-36 pb-24 sm:pt-44 sm:pb-32">
      <div className="container-site max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-5 text-display-lg">{title}</h1>
        <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-12 space-y-5 leading-relaxed text-ink/90 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </div>
    </section>
  );
}
