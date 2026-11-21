"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Logo } from "./logo";
import { buttonClasses } from "./ui";
import { nav, site, telLink, whatsappLink } from "@/content/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Pages with a full-bleed dark hero get a transparent header until scrolled.
  const overlay = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Close the menu whenever the route changes or the header is hidden by Activity.
  useLayoutEffect(() => {
    return () => setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("a,button");
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500 ${
        overlay
          ? "on-dark bg-transparent text-ivory"
          : "bg-ivory/92 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-md"
      }`}
    >
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Logo tone={overlay ? "light" : "dark"} onNavigate={() => setOpen(false)} />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="relative py-2 text-[0.9rem] font-medium tracking-[0.01em] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={telLink}
            className="hidden items-center gap-2 text-[0.9rem] font-medium xl:flex"
            aria-label={`Call us on ${site.phone.display}`}
          >
            <Phone className="size-4" aria-hidden />
            {site.phone.display}
          </a>
          <Link
            href="/contact#enquire"
            className={`hidden sm:inline-flex ${buttonClasses(overlay ? "gold" : "primary", "md")}`}
          >
            Book a consultation
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="-mr-2 grid size-11 place-items-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 top-[4.5rem] bottom-0 overflow-y-auto bg-ivory text-ink lg:hidden"
      >
        <nav aria-label="Mobile" className="container-site flex min-h-full flex-col pt-6 pb-10">
          <ul className="divide-y divide-line border-y border-line">
            {[{ label: "Home", href: "/" }, ...nav].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onNavigate={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex items-center justify-between py-5 font-display text-[1.75rem] aria-[current=page]:text-brass"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid gap-3 pt-10">
            <Link
              href="/contact#enquire"
              onNavigate={() => setOpen(false)}
              className={buttonClasses("primary", "lg")}
            >
              Book a consultation
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <a href={telLink} className={buttonClasses("secondary", "lg")}>
                Call
              </a>
              <a
                href={whatsappLink("Hello DreaamzArrow Homes, I'd like some help with a property.")}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "lg")}
              >
                WhatsApp
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">
              {site.address.locality}, {site.address.city} · Open six days a week, closed Tuesdays
            </p>
          </div>
        </nav>
      </div>
    </header>
  );
}
