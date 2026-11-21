import type { Metadata } from "next";
import Image from "next/image";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { OpeningHours } from "@/components/opening-hours";
import { MapEmbed } from "@/components/map-embed";
import { testimonials } from "@/content/testimonials";
import { site } from "@/content/site";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import courtyard from "../../../public/images/courtyard.webp";

export const metadata: Metadata = {
  title: "About us — a Hyderabad real estate consultancy",
  description:
    "DreaamzArrow Homes Infra Pvt Ltd is a Kondapur-based real estate consultancy built on trust, transparency and customer-first service. Read our story, mission and values.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    title: "Integrity",
    body: "We uphold honesty and transparency in every interaction. Our decisions are guided by ethics, trust and responsibility.",
  },
  {
    title: "Innovation",
    body: "We embrace modern ideas and smarter ways of working, to deliver efficient, future-ready real estate solutions in Hyderabad.",
  },
  {
    title: "Client focus",
    body: "We place our clients at the heart of everything we do, and aim to exceed expectations with clarity, care and consistent service.",
  },
];

const principles = [
  "We treat honesty as the foundation of a business’s trustworthiness and integrity.",
  "We always do the right thing to solve the client’s problem.",
  "We perform all work with the highest level of excellence in mind.",
];

export default function AboutPage() {
  return (
    <>
      <section className="pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="container-site grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading
              as="h1"
              eyebrow="About us"
              title="A Hyderabad firm built on relationships."
              intro={
                <p>
                  {site.legalName} was started by two friends with a shared vision. The company has grown through
                  resilience and a commitment to genuine relationships, guided by trust, transparency and
                  customer-first service.
                </p>
              }
            />
          </div>
          <p className="text-[1.05rem] leading-relaxed text-muted lg:col-span-4 lg:col-start-9" data-reveal>
            We specialise in premium residential and investment properties across Hyderabad&rsquo;s fastest-growing
            locations. With integrity, innovation and local expertise at our core, we guide clients towards confident
            and meaningful property decisions.
          </p>
        </div>
      </section>

      <div className="container-site">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] sm:aspect-[21/9]" data-reveal>
          <Image
            src={courtyard}
            alt="Landscaped courtyard in a gated residential community in HITEC City"
            fill
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>

      <section className="py-24 sm:py-32" aria-labelledby="mission-title">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Our mission</Eyebrow>
          </div>
          <div className="lg:col-span-8" data-reveal>
            <h2 id="mission-title" className="text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)] leading-[1.2]">
              To redefine real estate consultancy in Hyderabad by offering reliable, transparent and personalised
              services.
            </h2>
            <p className="mt-8 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
              We are committed to delivering high-quality assistance, from property search to site visits, negotiation
              and final documentation, so that every client experiences a smooth and secure property journey.
            </p>
          </div>
        </div>
      </section>

      <section className="on-dark bg-ink py-24 text-ivory sm:py-32" aria-labelledby="values-title">
        <div className="container-site">
          <Eyebrow>What we stand for</Eyebrow>
          <h2 id="values-title" className="mt-5 text-display-lg">
            Our values
          </h2>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line-dark md:grid-cols-3">
            {values.map((v, i) => (
              <li key={v.title} className="bg-ink p-8 sm:p-10" data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
                <h3 className="text-[1.75rem]">{v.title}</h3>
                <p className="mt-4 leading-relaxed text-muted-dark">{v.body}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-14 grid gap-6 border-t border-line-dark pt-10 md:grid-cols-3">
            {principles.map((p) => (
              <li key={p} className="font-display text-lg leading-snug text-ivory/90">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 py-24 sm:py-32" aria-labelledby="testimonials-title">
        <div className="container-site">
          <SectionHeading
            eyebrow="Client words"
            title={<span id="testimonials-title">In our clients&rsquo; own words.</span>}
          />
          <div className="mt-14 columns-1 gap-6 md:columns-2 lg:columns-3">
            {testimonials.map((t) => (
              <figure key={t.name + t.context} className="mb-6 break-inside-avoid rounded-[var(--radius-card)] border border-line bg-paper p-7" data-reveal>
                <blockquote className="leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 border-t border-line pt-4 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="block text-muted">{t.context}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-24 sm:py-32" aria-labelledby="office-title">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>Our office</Eyebrow>
            <h2 id="office-title" className="mt-5 text-display-md">
              Visit us in Kondapur.
            </h2>
            <address className="mt-6 leading-relaxed text-muted not-italic">
              {site.address.lines.join(", ")}
              <br />
              {site.address.city} {site.address.postalCode}
            </address>
            <div className="mt-8 max-w-sm">
              <OpeningHours />
            </div>
          </div>
          <div className="lg:col-span-7">
            <MapEmbed />
          </div>
        </div>
      </section>

      <CtaBand />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
    </>
  );
}
