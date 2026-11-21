import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { process, services } from "@/content/services";
import { localities } from "@/content/properties";
import { site } from "@/content/site";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Services — buying, renting, leasing & investment advisory",
  description:
    "Real estate consulting in Hyderabad: help with buying and renting homes, selling or leasing your property, and investment advisory, with site visits, negotiation and documentation handled end to end.",
  alternates: { canonical: "/services" },
};

const faqs = [
  {
    q: "Which areas of Hyderabad do you cover?",
    a: `We focus on West Hyderabad, with current listings in ${localities
      .map((l) => l.name)
      .join(", ")}. If you are considering another part of the city, ask us and we will tell you honestly whether we can help.`,
  },
  {
    q: "Can I visit a home before deciding?",
    a: "Yes. Every home we represent can be visited with a member of our team. Request a visit from any listing, or call or WhatsApp us, and we will arrange a time that suits you.",
  },
  {
    q: "I own an apartment. Can you find me a tenant?",
    a: "Yes. We prepare and promote the listing, accompany viewings with prospective tenants, and support you through negotiation and the rental agreement.",
  },
  {
    q: "When is your office open?",
    a: "Our Kondapur office is open from 9:30 am to 6:30 pm every day except Tuesday. Enquiries sent online outside these hours are picked up when the office reopens.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="container-site">
          <SectionHeading
            as="h1"
            eyebrow="Services"
            title="One accountable team for every property decision."
            intro={
              <p>
                From finding a home to rent next month to building a long-term portfolio, {site.name} handles the search,
                the visits, the negotiation and the paperwork, so that you can focus on the decision itself.
              </p>
            }
          />
          <nav aria-label="Services on this page" className="mt-12 flex flex-wrap gap-3">
            {services.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ink"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="border-t border-line">
        {services.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-title`}
            className={`scroll-mt-24 border-b border-line py-20 sm:py-24 ${i % 2 ? "bg-paper" : ""}`}
          >
            <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5" data-reveal>
                <span className="font-display text-lg text-brass">0{i + 1}</span>
                <h2 id={`${s.id}-title`} className="mt-4 text-display-md">
                  {s.title}
                </h2>
                <p className="mt-5 text-[1.05rem] leading-relaxed text-muted">{s.intro}</p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7" data-reveal>
                <p className="text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase">What it includes</p>
                <ul className="mt-5 divide-y divide-line border-y border-line">
                  {s.includes.map((item) => (
                    <li key={item} className="flex gap-4 py-4">
                      <Check className="mt-1 size-4 shrink-0 text-brass" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href={`/contact?intent=${s.intent}#enquire`}>
                    Discuss your requirement
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </ButtonLink>
                  {(s.id === "buying" || s.id === "renting") && (
                    <ButtonLink
                      href={`/properties?listing=${s.id === "buying" ? "sale" : "rent"}`}
                      variant="secondary"
                    >
                      Homes {s.id === "buying" ? "for sale" : "for rent"}
                    </ButtonLink>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="on-dark bg-ink py-24 text-ivory sm:py-32" aria-labelledby="process-title">
        <div className="container-site">
          <Eyebrow>Our approach</Eyebrow>
          <h2 id="process-title" className="mt-5 max-w-3xl text-display-lg">
            Five steps, the same every time.
          </h2>
          <ol className="mt-16 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line-dark md:grid-cols-5">
            {process.map((step, i) => (
              <li key={step.title} className="bg-ink p-7" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                <span className="font-display text-3xl text-sun">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-xl">{step.title}</h3>
                <p className="mt-3 text-[0.92rem] leading-relaxed text-muted-dark">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-24 sm:py-32" aria-labelledby="faq-title">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Questions</Eyebrow>
            <h2 id="faq-title" className="mt-5 text-display-md">
              Good to know
            </h2>
            <p className="mt-5 text-muted">
              Something else on your mind?{" "}
              <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
                Ask us directly
              </Link>
              .
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line lg:col-span-7 lg:col-start-6">
            {faqs.map((f) => (
              <details key={f.q} className="group py-2 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 font-display text-[1.25rem]">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-lg transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
    </>
  );
}
