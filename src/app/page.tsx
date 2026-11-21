import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { HeroSearch } from "@/components/hero-search";
import { PropertyCard } from "@/components/property-card";
import { CtaBand } from "@/components/cta-band";
import { communities, featuredProperties, localities, properties, toSummary } from "@/content/properties";
import { process, services } from "@/content/services";
import { testimonials } from "@/content/testimonials";
import heroImage from "../../public/images/hero-villa.webp";
import courtyardImage from "../../public/images/courtyard.webp";

export default function HomePage() {
  const [lead, ...others] = [testimonials[0], testimonials[2], testimonials[1]];

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="on-dark relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-ivory">
        <Image
          src={heroImage}
          alt="A contemporary villa in a gated community in HITEC City, Hyderabad"
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          className="-z-10 object-cover object-[50%_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(21_23_26/0.55)_0%,rgb(21_23_26/0.35)_35%,rgb(21_23_26/0.85)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(21_23_26/0.6)_0%,rgb(21_23_26/0)_65%)]" />
        <div className="container-site flex flex-1 flex-col justify-end pt-32 pb-10 sm:pb-14">
          <div className="max-w-4xl">
            <Eyebrow>Real estate advisory · West Hyderabad</Eyebrow>
            <h1 className="mt-6 text-display-xl text-ivory">Private real estate advice for West Hyderabad&rsquo;s finest addresses.</h1>
            <p className="mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-ivory/85 sm:text-[1.15rem]">
              DreaamzArrow Homes helps families, professionals and investors buy, rent, sell and lease premium homes
              across Kokapet, Kondapur, Narsingi, HITEC City and the Financial District, from the first shortlist to
              the final signature.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact#enquire" variant="gold" size="lg">
                Book a consultation
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/properties" variant="ghost-light" size="lg">
                View {properties.length} listed homes
              </ButtonLink>
            </div>
          </div>
          <div className="mt-12 max-w-4xl sm:mt-16">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* ───────────── Facts ───────────── */}
      <section aria-label="At a glance" className="border-b border-line bg-paper">
        <dl className="container-site grid grid-cols-2 divide-line py-8 md:grid-cols-4 md:divide-x">
          {[
            { k: "Homes currently listed", v: properties.length },
            { k: "Neighbourhoods covered", v: localities.length },
            { k: "Gated communities", v: communities.length },
            { k: "Office open six days a week", v: "Kondapur" },
          ].map((f) => (
            <div key={f.k} className="flex flex-col-reverse gap-1 px-2 py-4 md:px-8 md:first:pl-0">
              <dt className="text-[0.82rem] text-muted">{f.k}</dt>
              <dd className="font-display text-[2.1rem] leading-none">{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────────── Introduction ───────────── */}
      <section className="py-24 sm:py-32">
        <div className="container-site grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6" data-reveal>
            <Eyebrow>Who we are</Eyebrow>
            <h2 className="mt-5 text-display-lg">Trusted advisors, not pushy agents.</h2>
            <div className="prose-body mt-7 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              <p>
                DreaamzArrow Homes Infra Pvt Ltd is a Hyderabad real estate company started by two friends with a
                shared vision, and built on trust, transparency and customer-first service.
              </p>
              <p>
                We specialise in premium residential and investment property across Hyderabad&rsquo;s fastest-growing
                western corridor. Our role is simple: understand what you need, show you only what fits, and handle
                the visits, negotiation and paperwork so that every decision is a confident one.
              </p>
            </div>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 font-semibold underline-offset-[6px] hover:underline"
            >
              Our story and values <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="relative lg:col-span-6" data-reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-sand sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={courtyardImage}
                alt="Landscaped central courtyard between residential towers in HITEC City"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-6 max-w-[17rem] rounded-[var(--radius-card)] bg-ink p-6 text-ivory shadow-lift sm:left-auto sm:-right-6 on-dark">
              <p className="font-display text-xl leading-snug">From the first visit to the final document.</p>
              <p className="mt-2 text-sm text-muted-dark">One team, accountable for every step.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Services ───────────── */}
      <section className="on-dark bg-ink py-24 text-ivory sm:py-32">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="What we do"
              title="Advice for every side of a property decision."
              intro="Whether you are buying your next home, renting in a new city, leasing out an apartment or building a portfolio, you deal with one accountable team."
            />
            <ButtonLink href="/services" variant="ghost-light" className="self-start lg:self-end">
              All services
            </ButtonLink>
          </div>
          <ol className="mt-16 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line-dark sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <li key={s.id} className="group relative flex flex-col bg-ink p-8 transition-colors hover:bg-ink-soft" data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
                <span className="font-display text-sm text-sun">0{i + 1}</span>
                <h3 className="mt-10 text-[1.6rem] leading-tight">{s.title}</h3>
                <p className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-muted-dark">{s.short}</p>
                <Link
                  href={`/services#${s.id}`}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ivory after:absolute after:inset-0"
                >
                  Learn more<span className="sr-only"> about {s.title.toLowerCase()}</span>
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Featured homes ───────────── */}
      <section className="py-24 sm:py-32">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="Selected homes"
              title="A few of the homes we are representing now."
              intro="Apartments and villas in established gated communities, for sale and for rent. Every listing can be visited with our team."
            />
            <ButtonLink href="/properties" variant="secondary" className="self-start lg:self-end">
              Browse all {properties.length} homes
            </ButtonLink>
          </div>
          <ul className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((p, i) => (
              <li key={p.slug} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 3) * 90}ms` }}>
                <PropertyCard property={toSummary(p)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Neighbourhoods ───────────── */}
      <section className="border-y border-line bg-sand py-24 sm:py-32">
        <div className="container-site grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Where we work"
              title="Focused on Hyderabad’s western growth corridor."
              intro="We concentrate on the neighbourhoods around HITEC City, Gachibowli and the Financial District, close to the city’s major employers, schools and the Outer Ring Road."
            />
            <div className="mt-10" data-reveal>
              <p className="text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase">
                Communities with current listings
              </p>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{communities.join(" · ")}</p>
            </div>
          </div>
          <ul className="border-t border-ink/15 lg:col-span-6 lg:col-start-7">
            {localities.map((l) => (
              <li key={l.slug} className="border-b border-ink/15" data-reveal>
                <Link
                  href={`/properties?locality=${l.slug}`}
                  className="group flex items-baseline justify-between gap-6 py-5 transition-colors hover:text-brass"
                >
                  <span className="font-display text-[1.6rem] leading-none sm:text-[2rem]">{l.name}</span>
                  <span className="flex items-center gap-3 text-sm text-muted group-hover:text-brass">
                    {l.count} {l.count === 1 ? "home" : "homes"}
                    <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Process ───────────── */}
      <section className="py-24 sm:py-32">
        <div className="container-site">
          <SectionHeading
            eyebrow="How we work"
            title="A clear process, from brief to keys."
            intro="Every engagement follows the same five steps, so you always know what happens next and who is responsible for it."
          />
          <ol className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {process.map((step, i) => (
              <li key={step.title} className="relative border-t border-ink pt-6" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                <span className="font-display text-[2.4rem] leading-none text-brass-light">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 font-display text-[1.3rem]">{step.title}</h3>
                <p className="mt-3 text-[0.93rem] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Testimonials ───────────── */}
      <section className="bg-paper py-24 sm:py-32" aria-labelledby="testimonials-heading">
        <div className="container-site">
          <Eyebrow>Client words</Eyebrow>
          <h2 id="testimonials-heading" className="sr-only">
            What our clients say
          </h2>
          <figure className="mt-8 max-w-5xl" data-reveal>
            <blockquote className="font-display text-[clamp(1.6rem,1.2rem+1.8vw,2.75rem)] leading-[1.2]">
              &ldquo;{lead.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-sm">
              <span className="font-semibold">{lead.name}</span>
              <span className="text-muted"> · {lead.context}</span>
            </figcaption>
          </figure>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {others.map((t) => (
              <figure key={t.name} className="rounded-[var(--radius-card)] border border-line p-8" data-reveal>
                <blockquote className="leading-relaxed text-ink/90">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-muted"> · {t.context}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <Link
            href="/about#testimonials"
            className="mt-10 inline-flex items-center gap-2 font-semibold underline-offset-[6px] hover:underline"
          >
            Read more from our clients <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
