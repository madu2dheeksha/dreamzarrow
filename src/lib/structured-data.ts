import { site } from "@/content/site";
import { formatPrice, type Property } from "@/lib/property-utils";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/images/logo-full.png`,
    image: `${site.url}/images/hero-villa.webp`,
    description: site.description,
    telephone: site.phone.e164,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.lines.join(", "),
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    areaServed: { "@type": "City", name: "Hyderabad" },
    openingHoursSpecification: site.hours
      .filter((h) => h.open)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${h.day}`,
        opens: h.open,
        closes: h.close,
      })),
    sameAs: site.social.map((s) => s.href),
  };
}

export function listingJsonLd(p: Property) {
  const url = `${site.url}/properties/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": url,
    url,
    name: p.title,
    description: p.summary || p.headline,
    datePosted: p.publishedAt,
    dateModified: p.updatedAt,
    image: p.images.slice(0, 6).map((i) => `${site.url}${i.src}`),
    offers: {
      "@type": "Offer",
      businessFunction: p.listing === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      ...(p.price != null ? { price: p.price, priceCurrency: "INR" } : {}),
      description: formatPrice(p),
      seller: { "@id": `${site.url}/#organization` },
    },
    about: {
      "@type": p.propertyType === "villa" ? "SingleFamilyResidence" : "Apartment",
      numberOfRooms: p.bedrooms,
      numberOfBedrooms: p.bedrooms,
      ...(p.bathrooms != null ? { numberOfBathroomsTotal: p.bathrooms } : {}),
      ...(p.areaSqft ? { floorSize: { "@type": "QuantitativeValue", value: p.areaSqft, unitCode: "FTK" } } : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: p.locality,
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
      ...(p.community ? { containedInPlace: { "@type": "Residence", name: p.community } } : {}),
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${site.url}${it.path}`,
    })),
  };
}
