import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SectionHeading } from "@/components/ui";
import { EnquiryForm } from "@/components/enquiry-form";
import { MapEmbed } from "@/components/map-embed";
import { OpeningHours } from "@/components/opening-hours";
import { JsonLd } from "@/components/json-ld";
import { mailLink, site, telLink, whatsappLink } from "@/content/site";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Contact us — book a consultation or site visit",
  description: `Speak to ${site.name} in Kondapur, Hyderabad. Call ${site.phone.display}, message us on WhatsApp, or send an enquiry to book a consultation or site visit.`,
  alternates: { canonical: "/contact" },
};

const channels = [
  { icon: Phone, label: "Call", value: site.phone.display, href: telLink, external: false },
  { icon: MessageCircle, label: "WhatsApp", value: "Message us", href: whatsappLink("Hello DreaamzArrow Homes, I'd like some help with a property."), external: true },
  { icon: Mail, label: "Email", value: site.email, href: mailLink, external: false },
];

export default function ContactPage() {
  return (
    <>
      <section className="pt-36 pb-12 sm:pt-44 sm:pb-16">
        <div className="container-site">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title="Book a consultation or a site visit."
            intro="Tell us what you are looking for and the best way to reach you. You can also call or message us on WhatsApp during office hours."
          />
        </div>
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div id="enquire" className="scroll-mt-28 rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-card sm:p-10 lg:col-span-7">
            <h2 className="text-[1.75rem]">Send an enquiry</h2>
            <p className="mt-2 mb-8 text-[0.95rem] text-muted">
              Fields marked <span className="text-brass">*</span> are required.
            </p>
            <EnquiryForm submitLabel="Send enquiry" />
          </div>

          <aside className="space-y-10 lg:col-span-5" aria-label="Contact details">
            <ul className="divide-y divide-line border-y border-line">
              {channels.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-5 py-5"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-ivory">
                      <c.icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase">{c.label}</span>
                      <span className="mt-1 block break-all font-display text-xl">{c.value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div>
              <h2 className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase font-sans">
                <MapPin className="size-4" aria-hidden /> Office
              </h2>
              <address className="mt-3 leading-relaxed not-italic">
                {site.legalName}
                <br />
                {site.address.lines.join(", ")}
                <br />
                {site.address.city} {site.address.postalCode}
              </address>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase font-sans">
                <Clock className="size-4" aria-hidden /> Office hours
              </h2>
              <div className="mt-3">
                <OpeningHours />
              </div>
            </div>

            <MapEmbed />
          </aside>
        </div>
      </section>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
    </>
  );
}
