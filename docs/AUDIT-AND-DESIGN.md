# Audit of the previous site and design rationale

## Previous site (WordPress + Elementor + Estatik), audited 21 Nov 2026

**What worked and was kept**
- Genuine, specific content: 49 listings with detailed descriptions, key features, amenities and
  connectivity notes. All of it was migrated, with every listing URL preserved or redirected.
- Clear local focus: West Hyderabad gated communities.
- Nine named client testimonials, the mission statement and the core values.
- Contact details, business hours, the office map and an active WhatsApp channel.

**What was outdated or harming credibility**
- The page title rendered literally as "Home" above the hero. The hero was a third-party 360° viewer with a
  pasted-on logo, so the first screen did not say who the company is or what it does.
- Template filler presented as fact: "100% satisfaction guaranteed", "On-demand emergency services",
  "Highly qualified staff", "Wide service area". Removed.
- Account features nobody needed (Login, Sign up, My Profile, Save). They added friction and risked
  collecting personal data. Removed, and their URLs now redirect.
- Developer logos shown as "We're serving", which implies partnerships that may not exist. Removed, pending
  confirmation.
- Contact form markup was the login and registration forms. There was no real enquiry form, only WhatsApp.
- Heavy plugin stack (Elementor, Estatik, AddToAny, three Google font families including all 18 weights of
  Roboto and Roboto Slab), and a server firewall that returned "406 Not Acceptable" to ordinary HTTP clients.
- Data quality issues: "Year built: 1", "Price per sqft: 3 ₨", a floor level above the floor count. These
  values are ignored on the new site.

**Missing:** clear positioning, a services page, a process explanation, a real enquiry or booking flow,
filtering by neighbourhood, privacy and terms pages, structured data, and an XML sitemap linked from robots.txt.

## Positioning

"Private real estate advice for West Hyderabad's finest addresses." The company is presented as advisors
rather than listing agents, which the clients themselves describe: "trusted advisors, not pushy agents".
That positioning is backed by things the site can show: a curated set of gated-community homes, a five-step
process, accompanied visits, and documentation handled end to end. Every number on the site (49 homes,
10 neighbourhoods, 22 communities) is computed from the live listing data, so it stays true as listings change.

## Design system

No reference sites were supplied, so the direction comes from the brand and the audience: senior
professionals and investors choosing homes worth crores.

- **Colour:** ink `#15171a` and warm ivory `#f7f4ee` carry the site. Brass `#7b5812` (AA-compliant) is used
  for small accent text, and the logo's gold `#f2b72a` appears only on dark backgrounds, for primary calls to
  action. No gradients except dark overlays that keep text over photos legible.
- **Type:** Fraunces, a high-contrast variable serif with optical sizing, for headings. Manrope, a clean
  humanist sans, for body text and interface elements. Both are self-hosted by `next/font` with no layout
  shift. Display sizes scale fluidly with `clamp()`.
- **Components:** 4 px radius, hairline borders instead of heavy shadows, generous whitespace, numbered
  editorial lists for services and process, and a typographic neighbourhood index instead of stock imagery.
- **Motion:** a single subtle fade-up as sections enter the viewport. It is disabled when the visitor prefers
  reduced motion, and never applied to content already on screen.
- **Breakpoints:** Tailwind defaults (640, 768, 1024, 1280 px) plus 416 px. Mobile layouts were designed
  separately: sticky call / WhatsApp / visit bar on property pages, full-screen menu, stacked hero search,
  and two-column filters.

## Technical SEO

Unique titles and descriptions per page, canonical URLs, Open Graph image, `RealEstateAgent` organisation
schema with opening hours, `RealEstateListing` schema per property, breadcrumbs, an FAQ schema on Services,
an XML sitemap with image entries, robots.txt, and 308 redirects for every legacy URL.
