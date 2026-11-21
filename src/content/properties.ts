import data from "./properties.json";
import { slugifyLocality, type Property } from "@/lib/property-utils";

export * from "@/lib/property-utils";

export const properties = (data as Property[])
  .slice()
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

/** Localities ordered by number of listings. */
export const localities = Object.entries(
  properties.reduce<Record<string, number>>((acc, p) => {
    acc[p.locality] = (acc[p.locality] ?? 0) + 1;
    return acc;
  }, {}),
)
  .map(([name, count]) => ({ name, slug: slugifyLocality(name), count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

/** Gated communities with at least one current listing. */
export const communities = Array.from(
  new Set(properties.map((p) => p.community).filter((c): c is string => Boolean(c))),
).sort();

export const bhkOptions = Array.from(new Set(properties.map((p) => p.bhk))).sort();

/** Hand-picked for the home page — strongest photography, mix of villas and apartments. */
const FEATURED = [
  "4-bhk-villa-for-rent-in-hitech-city",
  "4-bhk-luxury-apartment-for-rent-in-hitec-city",
  "4-bhk-villas-for-rent-in-tellapur-osman-nagar",
  "3-bhk-semi-furnished-flat-for-rent-in-narsingi-2",
  "4-bhk-apartment-for-sale-in-kondapur-2",
  "3-bhk-apartment-for-rent-in-kokapet",
];

export const featuredProperties = FEATURED.map((s) => getProperty(s)).filter(
  (p): p is Property => Boolean(p),
);

export function similarProperties(p: Property, limit = 3) {
  return properties
    .filter((o) => o.slug !== p.slug)
    .map((o) => ({
      o,
      score:
        (o.locality === p.locality ? 3 : 0) +
        (o.community && o.community === p.community ? 2 : 0) +
        (o.listing === p.listing ? 1 : 0) +
        (o.bhk === p.bhk ? 1 : 0) +
        (o.propertyType === p.propertyType ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ o }) => o);
}
