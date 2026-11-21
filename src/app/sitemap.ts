import type { MetadataRoute } from "next";
import { properties } from "@/content/properties";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = properties.reduce((d, p) => (p.updatedAt > d ? p.updatedAt : d), "");
  const pages: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/properties`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  return [
    ...pages,
    ...properties.map((p) => ({
      url: `${site.url}/properties/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.slice(0, 5).map((i) => `${site.url}${i.src}`),
    })),
  ];
}
