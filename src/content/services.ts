/**
 * Services are drawn from what the previous site and published client
 * testimonials describe: buying, renting, selling/leasing for owners,
 * investment guidance, and end-to-end documentation support.
 */
export type Service = {
  id: string;
  title: string;
  short: string;
  intro: string;
  includes: string[];
  intent: string;
};

export const services: Service[] = [
  {
    id: "buying",
    title: "Buying a home",
    short: "A shortlist matched to your brief, accompanied visits, negotiation and paperwork, handled end to end.",
    intro:
      "Whether it is a first apartment or a gated-community villa, we begin with how you live: commute, schools, space and budget. Then we put forward only the homes worth your time.",
    includes: [
      "A considered shortlist from current resale and new inventory",
      "Site visits arranged and accompanied by our team",
      "Price negotiation on your behalf",
      "Support with documentation through to completion",
    ],
    intent: "buy",
  },
  {
    id: "renting",
    title: "Renting a home",
    short: "Verified rental homes in established communities, visits around your schedule and a clean agreement process.",
    intro:
      "For professionals and families relocating to or within Hyderabad, we keep the search focused, the communication quick and the paperwork transparent.",
    includes: [
      "Homes shortlisted to your budget, size and location",
      "Visits scheduled around your working week",
      "Clear explanation of terms, deposits and maintenance",
      "Rental agreement and move-in coordinated",
    ],
    intent: "rent",
  },
  {
    id: "owners",
    title: "Selling or leasing your property",
    short: "For owners: presentation, promotion, viewings and negotiation to find the right buyer or tenant.",
    intro:
      "We represent your property the way we would want ours represented: well photographed, accurately described and shown to people who are genuinely a fit.",
    includes: [
      "Photography and listing preparation",
      "Promotion across our listings and channels",
      "Accompanied viewings with prospective tenants or buyers",
      "Negotiation and agreement support",
    ],
    intent: "list",
  },
  {
    id: "investment",
    title: "Investment advisory",
    short: "Guidance on residential and commercial opportunities, with the analysis to support each decision.",
    intro:
      "For investors building a property portfolio in Hyderabad, we look at location, demand and the asset itself, and we stay involved after the transaction.",
    includes: [
      "Opportunity identification across West Hyderabad",
      "Comparative analysis to support your decision",
      "Coordination of visits, negotiation and documentation",
      "Ongoing support after the purchase",
    ],
    intent: "invest",
  },
];

/** The consulting process, based on the company's stated mission. */
export const process = [
  {
    title: "Understand the brief",
    body: "A conversation about what you need, from location, size and budget to timelines and the things that are not negotiable.",
  },
  {
    title: "Curate the shortlist",
    body: "We filter the market for you and present a focused set of homes, with honest notes on each.",
  },
  {
    title: "Accompanied site visits",
    body: "We arrange and attend visits so you see each home, and its community, properly.",
  },
  {
    title: "Negotiate",
    body: "We handle the conversation on price and terms, keeping you informed at every step.",
  },
  {
    title: "Documentation & handover",
    body: "Agreements and paperwork are coordinated carefully so the final step is the simplest one.",
  },
];

export const enquiryIntents = [
  { value: "buy", label: "Buy a home" },
  { value: "rent", label: "Rent a home" },
  { value: "list", label: "Sell or lease my property" },
  { value: "invest", label: "Investment advice" },
  { value: "site-visit", label: "Schedule a site visit" },
  { value: "other", label: "Something else" },
] as const;

export type EnquiryIntent = (typeof enquiryIntents)[number]["value"];
