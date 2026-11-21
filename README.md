# DreaamzArrow Homes — website

The website of DreaamzArrow Homes Infra Pvt Ltd, a real estate consultancy in Kondapur, Hyderabad.
It is a full rebuild of the previous WordPress/Estatik site. All 49 listings, their 480 photos, the company
details and the published testimonials have been migrated.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Zod.
No database and no CMS: content lives in typed files in `src/content/`.

## Quick start

Requirements: Node.js 20.9 or later (developed on 22), npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values you have
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (type-checks and prerenders every page) |
| `npm start` | Serve the production build (`PORT=3100 npm start` to change the port) |
| `npm run lint` | ESLint, including the React Compiler rules |

## Environment variables

See `.env.example`. None are required to build or run. Without email or webhook credentials the enquiry
forms **do not pretend to succeed**: they show the visitor a WhatsApp link (pre-filled with the enquiry text)
and the phone number instead.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical domain for SEO tags, the sitemap and structured data |
| `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL` | Email every enquiry to the team through [Resend](https://resend.com). All three are needed, and the sender domain must be verified in Resend. |
| `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_SECRET` | Optional. POSTs each lead as JSON to a CRM or automation tool (HubSpot, Zoho, Zapier, Make, Google Sheets via Apps Script). |

Webhook payload:

```json
{ "source": "website", "submittedAt": "2026-11-21T19:02:37.695Z", "id": "uuid",
  "name": "…", "phone": "…", "email": "… or null", "intent": "site-visit",
  "intentLabel": "Schedule a site visit", "property": "… or null",
  "preferredDate": "YYYY-MM-DD or null", "message": "… or null", "page": "/properties/…" }
```

## Deployment (Vercel, recommended)

1. Push this repository to GitHub and import it in Vercel. The framework is detected automatically.
2. Add the environment variables under *Project → Settings → Environment Variables*.
3. Deploy, test the preview URL (send a real enquiry), then add the domain `www.dreaamzarrowhomes.com`
   and point DNS at Vercel. Keep `dreaamzarrowhomes.com` redirecting to `www`.
4. After go-live, submit `https://www.dreaamzarrowhomes.com/sitemap.xml` in Google Search Console.

Any Node.js host that runs `npm run build && npm start` also works (Render, Railway, a VPS behind Nginx).
Cache Components needs the Node.js runtime, so static-only export hosting is not supported.

**Old URLs keep working.** `next.config.ts` permanently redirects every WordPress URL
(`/property/…`, `/all-properties/…`, `/property-type/…`, `/my-properties-2/for-rent/`, login and profile pages)
to its new equivalent, which preserves search rankings and links people have already shared.

## Editing content

| What | Where |
| --- | --- |
| Phone, email, address, hours, social links, RERA number | `src/content/site.ts` |
| Listings | `src/content/properties.json`, photos in `public/media/properties/<slug>/` |
| Home page featured listings | `FEATURED` in `src/content/properties.ts` |
| Services, process steps, enquiry options | `src/content/services.ts` |
| Testimonials | `src/content/testimonials.ts` (only add ones that clients have approved) |
| Brand colours and type | `@theme` block in `src/app/globals.css` |

**Adding a listing:** copy an existing entry in `properties.json`, give it a unique `slug` (it becomes the URL),
put the photos in `public/media/properties/<slug>/` as `.webp`, about 2000 px on the long side, and list them in
`images` with their width and height. The first image is the cover photo. Set `price` to `null` for
"Price on request". Removing a listing: delete the entry and its photo folder. The URL will then show the
"page not found" screen, which points visitors to current listings.

If listings change several times a week, a headless CMS (Sanity, or keeping WordPress only as a back end)
can replace the JSON file without changing the pages. See `docs/CONTENT-TODO.md`.

## Project structure

```
src/
  app/                    Routes: / · /properties · /properties/[slug] · /services · /about · /contact
    api/enquiry/route.ts  Enquiry endpoint (validation, honeypot, rate limit, de-duplication, delivery)
    sitemap.ts robots.ts  SEO files (also icon.png, apple-icon.png, opengraph-image.jpg)
  components/             UI (header, footer, enquiry form, gallery, property explorer and others)
  content/                Company facts, listings, services, testimonials
  lib/                    Validation schema, lead delivery, structured data, property helpers
docs/                     Site audit, design notes, outstanding content
```

## Quality checks performed

- Production build, TypeScript and ESLint: clean.
- End-to-end browser tests (Playwright) of the forms (validation, double-submit guard, success and fallback
  states), filters, hero search, gallery, video embed, mobile menu and a crawl of every internal link.
  All 72 URLs return 200 with no console errors.
- Email (Resend request format) and webhook delivery verified against a local mock endpoint. A live Resend
  send has **not** been tested yet, because it needs the company's API key.
- Lighthouse (mobile): Performance 99–100 on the home, listings, services, about and contact pages, and in the
  90s on property detail pages. Accessibility, Best Practices and SEO: 100.
