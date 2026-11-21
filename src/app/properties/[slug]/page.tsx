import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Building2, Check, Home, MapPin, Maximize, MessageCircle, Phone } from "lucide-react";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyCard } from "@/components/property-card";
import { EnquiryForm } from "@/components/enquiry-form";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { JsonLd } from "@/components/json-ld";
import { Eyebrow, buttonClasses } from "@/components/ui";
import {
  formatPrice,
  getProperty,
  listingLabel,
  properties,
  similarProperties,
  slugifyLocality,
  toSummary,
  typeLabel,
} from "@/content/properties";
import { site, telLink, whatsappLink } from "@/content/site";
import { breadcrumbJsonLd, listingJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProperty(slug);
  if (!p) return { title: "Property not found" };
  const title = `${p.title}${p.community ? ` — ${p.community}` : ""}`;
  const description = (p.summary || p.headline).slice(0, 158);
  return {
    title,
    description,
    alternates: { canonical: `/properties/${p.slug}` },
    openGraph: {
      title,
      description,
      url: `/properties/${p.slug}`,
      images: p.images[0] ? [{ url: p.images[0].src, width: p.images[0].width, height: p.images[0].height }] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  const p = getProperty(slug);
  if (!p) notFound();

  const reference = `${p.title}${p.community ? ` — ${p.community}` : ""}`;
  const waMessage = `Hello ${site.name}, I'm interested in "${reference}" (${site.url}/properties/${p.slug}). Could you share more details?`;
  const similar = similarProperties(p, 3);

  const facts = [
    { icon: BedDouble, label: "Bedrooms", value: String(p.bedrooms) },
    ...(p.bathrooms != null ? [{ icon: Bath, label: "Bathrooms", value: String(p.bathrooms) }] : []),
    ...(p.areaSqft ? [{ icon: Maximize, label: "Built-up area", value: `${p.areaSqft.toLocaleString("en-IN")} sq ft` }] : []),
    { icon: p.propertyType === "villa" ? Home : Building2, label: "Type", value: `${p.bhk} BHK ${typeLabel(p.propertyType)}` },
  ];

  return (
    <>
      <div className="pt-24 sm:pt-28">
        <div className="container-site">
          <nav aria-label="Breadcrumb" className="py-4 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/properties" className="hover:text-ink">
                  Properties
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/properties?locality=${slugifyLocality(p.locality)}`} className="hover:text-ink">
                  {p.locality}
                </Link>
              </li>
            </ol>
          </nav>

          <PropertyGallery images={p.images} title={reference} />
        </div>
      </div>

      <div className="container-site grid gap-14 pt-10 pb-24 lg:grid-cols-12 lg:gap-16 lg:pb-32">
        <article className="lg:col-span-7 xl:col-span-8">
          <header>
            <div className="flex flex-wrap gap-2 text-[0.72rem] font-bold tracking-[0.1em] uppercase">
              <span className={`rounded-full px-3 py-1 ${p.listing === "rent" ? "bg-sand" : "bg-ink text-ivory"}`}>
                {listingLabel(p.listing)}
              </span>
              <span className="rounded-full border border-line px-3 py-1">{typeLabel(p.propertyType)}</span>
            </div>
            <h1 className="mt-5 text-display-md">{p.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-muted">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {p.community ? `${p.community}, ` : ""}
              {p.locality}, Hyderabad
            </p>
            <p className="mt-6 font-display text-[1.6rem]">{formatPrice(p)}</p>
          </header>

          <dl className={`mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${facts.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            {facts.map((f) => (
              <div key={f.label} className="bg-paper p-5">
                <dt className="flex items-center gap-2 text-[0.78rem] text-muted">
                  <f.icon className="size-4" aria-hidden />
                  {f.label}
                </dt>
                <dd className="mt-2 font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-14" aria-labelledby="overview">
            <h2 id="overview" className="text-[1.75rem]">
              Overview
            </h2>
            {p.summary && <p className="mt-5 text-[1.1rem] leading-relaxed">{p.summary}</p>}
            {p.description.length > 0 && (
              <div className="prose-body mt-5 leading-relaxed text-muted">
                {p.description.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            )}
          </section>

          {p.keyFeatures.length > 0 && (
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="features">
              <h2 id="features" className="text-[1.75rem]">
                Key features
              </h2>
              <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {p.keyFeatures.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-brass" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.amenities.length > 0 && (
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="amenities">
              <h2 id="amenities" className="text-[1.75rem]">
                Community amenities
              </h2>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <li key={a} className="rounded-full border border-line bg-paper px-4 py-2 text-[0.9rem]">
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.youtubeId && (
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="video">
              <h2 id="video" className="text-[1.75rem]">
                Video walkthrough
              </h2>
              <div className="mt-6">
                <YouTubeEmbed id={p.youtubeId} title={`Video walkthrough: ${reference}`} />
              </div>
            </section>
          )}

          {p.nearby.length > 0 && (
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="location">
              <h2 id="location" className="text-[1.75rem]">
                Location &amp; connectivity
              </h2>
              <dl className="mt-6 divide-y divide-line border-y border-line">
                {p.nearby.map((n) => (
                  <div key={n.label} className="grid gap-1 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                    <dt className="text-[0.9rem] font-semibold">{n.label}</dt>
                    <dd className="text-[0.95rem] text-muted">{n.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {p.details.length > 0 && (
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="details">
              <h2 id="details" className="text-[1.75rem]">
                Additional details
              </h2>
              <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {p.details.map((d) => (
                  <div key={d.label} className="flex justify-between gap-6 border-b border-line py-3 text-[0.95rem]">
                    <dt className="text-muted">{d.label}</dt>
                    <dd className="text-right font-medium">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <p className="mt-12 text-[0.82rem] leading-relaxed text-muted">
            Details are provided in good faith from the owner or developer and may change. Please verify specifications,
            pricing and availability with our team before making any decision.
          </p>
        </article>

        <aside className="lg:col-span-5 xl:col-span-4" aria-label="Enquire about this home">
          <div id="enquire" className="rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-card sm:p-8 lg:sticky lg:top-28">
            <Eyebrow>Arrange a visit</Eyebrow>
            <h2 className="mt-4 text-[1.6rem] leading-tight">See this home with our team.</h2>
            <p className="mt-3 text-[0.93rem] text-muted">
              Share your details and we will confirm a visit time, or answer any questions first.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <a href={whatsappLink(waMessage)} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
              <a href={telLink} className={buttonClasses("secondary")}>
                <Phone className="size-4" aria-hidden />
                Call
              </a>
            </div>
            <div className="my-6 flex items-center gap-4 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or send a request
              <span className="h-px flex-1 bg-line" />
            </div>
            <EnquiryForm
              compact
              showIntent={false}
              defaultIntent="site-visit"
              property={reference}
              submitLabel="Request a visit"
            />
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-line bg-sand py-20 sm:py-24" aria-labelledby="similar">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="similar" className="text-display-md">
                Similar homes
              </h2>
              <Link href="/properties" className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline">
                <ArrowLeft className="size-4" aria-hidden /> All properties
              </Link>
            </div>
            <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <li key={s.slug}>
                  <PropertyCard property={toSummary(s)} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Mobile contact bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a href={telLink} className={buttonClasses("secondary", "md", "px-2")}>
            <Phone className="size-4" aria-hidden />
            Call
          </a>
          <a href={whatsappLink(waMessage)} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md", "px-2")}>
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
          <a href="#enquire" className={buttonClasses("primary", "md", "px-2")}>
            Visit
          </a>
        </div>
      </div>

      <JsonLd data={listingJsonLd(p)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Properties", path: "/properties" },
          { name: p.title, path: `/properties/${p.slug}` },
        ])}
      />
    </>
  );
}
