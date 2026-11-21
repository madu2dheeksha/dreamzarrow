/** Property types and formatting helpers — safe to import from client components (no data). */

export type ListingType = "sale" | "rent";
export type PropertyType = "apartment" | "villa";

export type PropertyImage = { src: string; width: number; height: number };

export type Property = {
  slug: string;
  /** Slug used on the previous WordPress site — kept for redirects. */
  legacySlug: string;
  title: string;
  listing: ListingType;
  propertyType: PropertyType;
  bhk: number;
  bedrooms: number;
  bathrooms: number | null;
  areaSqft: number | null;
  /** Monthly rent or sale price in INR. `null` means "price on request". */
  price: number | null;
  locality: string;
  community: string | null;
  headline: string;
  summary: string;
  description: string[];
  keyFeatures: string[];
  amenities: string[];
  nearby: { label: string; value: string }[];
  details: { label: string; value: string }[];
  youtubeId: string | null;
  images: PropertyImage[];
  publishedAt: string;
  updatedAt: string;
};

export function slugifyLocality(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function formatPrice(p: Pick<Property, "price" | "listing">) {
  if (p.price == null) return "Price on request";
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(p.price);
  return p.listing === "rent" ? `${amount} / month` : amount;
}

export function listingLabel(listing: ListingType) {
  return listing === "rent" ? "For rent" : "For sale";
}

export function typeLabel(type: PropertyType) {
  return type === "villa" ? "Villa" : "Apartment";
}

/** The subset of a property needed to render a card. */
export type PropertySummary = Pick<
  Property,
  "slug" | "title" | "listing" | "propertyType" | "bhk" | "bedrooms" | "bathrooms" | "areaSqft" | "price" | "locality" | "community" | "publishedAt"
> & { image: PropertyImage | null };

export function toSummary(p: Property): PropertySummary {
  const { slug, title, listing, propertyType, bhk, bedrooms, bathrooms, areaSqft, price, locality, community, publishedAt } = p;
  return { slug, title, listing, propertyType, bhk, bedrooms, bathrooms, areaSqft, price, locality, community, publishedAt, image: p.images[0] ?? null };
}
