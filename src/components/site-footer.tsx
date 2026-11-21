import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";
import { mailLink, nav, site, telLink, whatsappLink } from "@/content/site";
import { localities } from "@/content/properties";
import { services } from "@/content/services";
import { OpeningHours } from "./opening-hours";
import { CurrentYear } from "./current-year";

export function SiteFooter() {
  return (
    <footer className="on-dark bg-ink text-ivory">
      <div className="container-site grid gap-12 pt-20 pb-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Logo tone="light" />
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-muted-dark">
            A Kondapur-based real estate consultancy for buying, renting, selling and leasing premium homes across
            West Hyderabad.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {site.social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ivory/85 transition-colors hover:text-sun"
                >
                  {s.label}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 lg:col-span-4">
          <div>
            <h2 className="font-sans text-xs font-bold tracking-[0.18em] text-sun uppercase">Explore</h2>
            <ul className="mt-5 space-y-3 text-[0.95rem]">
              {[{ label: "Home", href: "/" }, ...nav].map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-ivory/85 transition-colors hover:text-sun">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-xs font-bold tracking-[0.18em] text-sun uppercase">Services</h2>
            <ul className="mt-5 space-y-3 text-[0.95rem]">
              {services.map((s) => (
                <li key={s.id}>
                  <Link href={`/services#${s.id}`} className="text-ivory/85 transition-colors hover:text-sun">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2">
            <h2 className="font-sans text-xs font-bold tracking-[0.18em] text-sun uppercase">Neighbourhoods</h2>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {localities.map((l) => (
                <li key={l.slug}>
                  <Link
                    href={`/properties?locality=${l.slug}`}
                    className="text-ivory/70 transition-colors hover:text-sun"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="md:col-span-2 lg:col-span-4">
          <h2 className="font-sans text-xs font-bold tracking-[0.18em] text-sun uppercase">Visit the office</h2>
          <address className="mt-5 text-[0.95rem] leading-relaxed text-ivory/85 not-italic">
            {site.legalName}
            <br />
            {site.address.lines.map((l) => (
              <span key={l}>
                {l}
                <br />
              </span>
            ))}
            {site.address.city} {site.address.postalCode}
          </address>
          <ul className="mt-5 space-y-2 text-[0.95rem]">
            <li>
              <a href={telLink} className="text-ivory transition-colors hover:text-sun">
                {site.phone.display}
              </a>
            </li>
            <li>
              <a href={mailLink} className="break-all text-ivory transition-colors hover:text-sun">
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ivory transition-colors hover:text-sun"
              >
                WhatsApp us
              </a>
            </li>
          </ul>
          <div className="mt-6 text-sm text-muted-dark">
            <OpeningHours compact />
          </div>
        </div>
      </div>

      <div className="border-t border-line-dark">
        <div className="container-site flex flex-col gap-4 pt-6 pb-24 lg:pb-6 text-[0.8rem] text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear /> {site.legalName}. All rights reserved.
            {site.reraRegistration && <> · TS RERA {site.reraRegistration}</>}
          </p>
          <ul className="flex gap-6">
            <li>
              <Link href="/privacy" className="hover:text-ivory">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ivory">
                Terms of use
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
