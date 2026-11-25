import "server-only";
import { properties as allProperties } from "@/content/properties";
import { formatPrice, type Property } from "@/lib/property-utils";
import { site } from "@/content/site";
import { db } from "./db";

/**
 * The property "database" for the AI assistant.
 * Listing details come from the website's own src/content/properties.json (no copy),
 * and live availability comes from the `property_status` table that staff edit in /admin.
 */

export type Availability = "available" | "under_offer" | "sold" | "rented" | "hidden";

let statusCache: { at: number; map: Map<string, Availability> } | null = null;
const STATUS_TTL_MS = 60_000;

export async function availabilityMap(): Promise<Map<string, Availability>> {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.map;
  const map = new Map<string, Availability>();
  const client = db();
  if (client) {
    const { data, error } = await client.from("property_status").select("slug, availability");
    if (error) {
      console.error("[inventory] could not load availability:", error.message);
      // Fail closed for anything already marked unavailable; keep the previous cache if we have one.
      if (statusCache) return statusCache.map;
    } else {
      for (const row of data ?? []) map.set(row.slug, row.availability as Availability);
    }
  }
  statusCache = { at: Date.now(), map };
  return map;
}

export function invalidateAvailabilityCache() {
  statusCache = null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spellings customers use → the locality names in the listings. */
const LOCALITY_ALIASES: Record<string, string> = {
  hitechcity: "HITEC City",
  hiteccity: "HITEC City",
  hitech: "HITEC City",
  hitec: "HITEC City",
  madhapur: "HITEC City",
  financialdistrict: "Financial District",
  findistrict: "Financial District",
  fd: "Financial District",
  nanakramguda: "Financial District",
  gachibowli: "Gachibowli",
  kondapur: "Kondapur",
  kokapet: "Kokapet",
  narsingi: "Narsingi",
  shaikpet: "Shaikpet",
  gandipet: "Gandipet",
  manikonda: "Manikonda",
  tellapur: "Tellapur",
  osmannagar: "Tellapur",
};

export function resolveLocality(input: string): string | null {
  const n = norm(input);
  if (!n) return null;
  if (LOCALITY_ALIASES[n]) return LOCALITY_ALIASES[n];
  const direct = allProperties.find((p) => norm(p.locality) === n);
  if (direct) return direct.locality;
  // "flats in kokapet area" style input.
  for (const [alias, name] of Object.entries(LOCALITY_ALIASES)) if (alias.length > 3 && n.includes(alias)) return name;
  return null;
}

export const propertyUrl = (p: Pick<Property, "slug">) => `${site.url}/properties/${p.slug}`;

/** WhatsApp image messages need JPEG/PNG; the site stores WebP, so we convert on the fly. */
export const whatsappImageUrl = (p: Pick<Property, "slug">, index = 0) =>
  `${site.url}/api/media/whatsapp/${encodeURIComponent(p.slug)}/${index}`;

function furnishingOf(p: Property) {
  return p.details.find((d) => d.label === "Furnishing")?.value ?? null;
}

/** Compact, factual view of a listing for the AI. Only fields that exist in the data. */
export function listingFacts(p: Property, availability: Availability = "available") {
  return {
    slug: p.slug,
    title: p.title,
    for: p.listing === "rent" ? "rent" : "sale",
    type: p.propertyType,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    area_sqft: p.areaSqft,
    price: p.price == null ? "Price on request — the sales team will confirm" : formatPrice(p),
    price_known: p.price != null,
    locality: p.locality,
    community: p.community,
    furnishing: furnishingOf(p),
    availability,
    summary: p.summary,
    url: propertyUrl(p),
    photos: p.images.length,
    video: p.youtubeId ? `https://www.youtube.com/watch?v=${p.youtubeId}` : null,
    brochure: null as string | null, // No brochures are published on the website yet.
  };
}

export function listingDetails(p: Property, availability: Availability = "available") {
  return {
    ...listingFacts(p, availability),
    key_features: p.keyFeatures,
    amenities: p.amenities,
    nearby: p.nearby,
    details: p.details,
    description: p.description,
  };
}

export type SearchCriteria = {
  listing?: "sale" | "rent" | "any";
  property_type?: "apartment" | "villa" | "any";
  bhk?: number[];
  localities?: string[];
  max_budget?: number;
  min_budget?: number;
  furnishing?: string;
  limit?: number;
};

export type SearchResult = {
  matches: ReturnType<typeof listingFacts>[];
  /** Localities the customer asked for that we have no listings in at all. */
  unknown_localities: string[];
  note: string;
};

/**
 * Deterministic search over the real listings. Listings without a price are kept
 * when a budget is given (they are "price on request") but ranked lower.
 */
export async function searchProperties(c: SearchCriteria): Promise<SearchResult> {
  const avail = await availabilityMap();
  const isBookable = (p: Property) => {
    const a = avail.get(p.slug) ?? "available";
    return a === "available" || a === "under_offer";
  };

  const wanted = (c.localities ?? []).map((l) => ({ raw: l, name: resolveLocality(l) }));
  const localityNames = wanted.map((w) => w.name).filter((n): n is string => Boolean(n));
  const unknown = wanted.filter((w) => !w.name).map((w) => w.raw);

  const scored = allProperties
    .filter(isBookable)
    .filter((p) => !c.listing || c.listing === "any" || p.listing === c.listing)
    .filter((p) => !c.property_type || c.property_type === "any" || p.propertyType === c.property_type)
    .filter((p) => !c.bhk?.length || c.bhk.includes(p.bhk))
    // If the customer named areas, only those count — even when none of them match a listing.
    .filter((p) => !wanted.length || localityNames.includes(p.locality))
    .filter((p) => p.price == null || c.max_budget == null || p.price <= c.max_budget * 1.1)
    .filter((p) => p.price == null || c.min_budget == null || p.price >= c.min_budget * 0.8)
    .map((p) => {
      let score = 0;
      if (p.price != null && (c.max_budget != null || c.min_budget != null)) score += 3;
      if (c.furnishing && furnishingOf(p)?.toLowerCase().includes(c.furnishing.toLowerCase().slice(0, 4))) score += 2;
      if ((avail.get(p.slug) ?? "available") === "available") score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || b.p.publishedAt.localeCompare(a.p.publishedAt));

  const limit = Math.min(Math.max(c.limit ?? 3, 1), 5);
  const matches = scored.slice(0, limit).map(({ p }) => listingFacts(p, avail.get(p.slug) ?? "available"));
  let note: string;
  if (!matches.length) note = "No current listing matches. Do not suggest other properties as if they match; collect requirements and offer a consultant callback.";
  else if (scored.length > limit) note = `${scored.length} listings match; showing the best ${limit}.`;
  else note = `${matches.length} listing(s) match.`;
  if (unknown.length) note += ` We currently have no listings in: ${unknown.join(", ")}.`;
  return { matches, unknown_localities: unknown, note };
}

export async function getListing(slug: string) {
  const p = allProperties.find((x) => x.slug === slug);
  if (!p) return null;
  const a = (await availabilityMap()).get(slug) ?? "available";
  if (a === "hidden") return null;
  return { property: p, availability: a };
}

/** Which localities and configurations exist at all — lets the AI answer "what areas do you cover?" truthfully. */
export function inventoryOverview() {
  const byLocality: Record<string, { sale: number; rent: number }> = {};
  for (const p of allProperties) {
    byLocality[p.locality] ??= { sale: 0, rent: 0 };
    byLocality[p.locality][p.listing]++;
  }
  return {
    localities: byLocality,
    types: Array.from(new Set(allProperties.map((p) => p.propertyType))),
    bhk: Array.from(new Set(allProperties.map((p) => p.bhk))).sort(),
    note: "Counts include listings that staff may have since marked sold/rented; always use search_properties for availability.",
  };
}
