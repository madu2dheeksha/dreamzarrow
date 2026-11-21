# Information needed from DreaamzArrow Homes

Nothing on the site has been invented. The items below were missing or unclear on the old site. Each one is
either left out of the new site or marked here until you confirm it. Items marked **launch** should be resolved
before going live.

## Credentials and integrations

- [ ] **launch:** Email delivery: a Resend account (free tier is enough), with the `dreaamzarrowhomes.com`
      domain verified, and the inbox that should receive enquiries. Until this is set, forms point visitors to
      WhatsApp and phone instead.
- [ ] Optional: the CRM to connect (HubSpot, Zoho, a Google Sheet). It plugs in through `LEAD_WEBHOOK_URL`.
- [ ] Hosting account (Vercel recommended) and access to the domain's DNS.
- [ ] Optional: Google Search Console and an analytics tool, if you want one. None is installed, so no cookie
      banner is currently needed.

## Facts to confirm

- [ ] **launch:** TS RERA agent registration number. Telangana requires it on agent advertising. Add it to
      `reraRegistration` in `src/content/site.ts` and it will appear in the footer.
- [ ] Year founded and founders' names. The site currently says only "started by two friends".
- [ ] Fee model. The old site listed "Honest and flat-rate pricing". It was removed because it is not explained
      anywhere; confirm it and it can go back with details.
- [ ] Commercial property: one testimonial mentions a commercial portfolio. Should commercial leasing or sales be
      a named service?
- [ ] Developer logos: the old home page showed a "We're serving" banner with logos from My Home, Brigade,
      Prestige, Aparna and others. Logos imply a formal relationship, so they were left out; communities are
      named only where you have a listing. If you have written partnerships or channel-partner agreements,
      say so and we can show them properly.
- [ ] Testimonials: "Vinay Gupta" and "Vinay Guptha" appear as two different reviews on the old site. Same
      person? Also confirm all nine clients are happy for their first name to appear.

## Assets that would lift the site

- [ ] **Logo as a vector file (SVG or AI/EPS).** The only file available is a 511 px PNG, so the header uses
      the mark plus a typeset wordmark.
- [ ] Professional photography. The current listing photos are phone shots, often with wide-angle distortion.
      Even 10–15 good images (team, office, a few signature homes, Hyderabad skyline at dusk) would make the
      biggest visual difference.
- [ ] Team photos and short bios, which add a lot of trust for an advisory business.
- [ ] Which listing the 360° tour on the old home page (momento360) belongs to, so it can be added to that
      property's page.
- [ ] Prices or rent for listings, where you are happy to publish them. 46 of 49 currently show "Price on request".
- [ ] Built-up areas (sq ft). Only 4 listings have them.

## Listings housekeeping

- [ ] Several listings exist as separate sale and rent entries for the same home, which is fine. Please
      confirm all 49 are still available; any that have been let or sold should be removed.
- [ ] Optional: market insights articles. The brief mentioned them, but none exist, so no blog section was
      built. Add one once there is a commitment to publish regularly.
