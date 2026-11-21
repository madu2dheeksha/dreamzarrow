import type { NextConfig } from "next";
import properties from "./src/content/properties.json";

/**
 * Permanent redirects from the previous WordPress (Estatik) site so existing
 * search rankings, shared links and WhatsApp forwards keep working.
 */
const legacyRedirects = [
  { source: "/all-properties", destination: "/properties" },
  { source: "/all-properties/for-sale", destination: "/properties?listing=sale" },
  { source: "/my-properties-2/for-rent", destination: "/properties?listing=rent" },
  { source: "/property-category/sale", destination: "/properties?listing=sale" },
  { source: "/property-category/rent", destination: "/properties?listing=rent" },
  { source: "/property-type/villas", destination: "/properties?type=villa" },
  { source: "/property-type/flat", destination: "/properties?type=apartment" },
  { source: "/property-type/:bhk(\\d)-bhk", destination: "/properties?bhk=:bhk" },
  // Listings whose new slug differs from the old one (numeric WordPress IDs).
  ...properties
    .filter((p) => p.legacySlug !== p.slug)
    .map((p) => ({ source: `/property/${p.legacySlug}`, destination: `/properties/${p.slug}` })),
  { source: "/property/:slug", destination: "/properties/:slug" },
  // Account pages from the old theme no longer exist.
  { source: "/my-profile/:path*", destination: "/contact" },
  { source: "/login-2", destination: "/contact" },
  { source: "/sign-up", destination: "/contact" },
  { source: "/author/:path*", destination: "/about" },
  { source: "/home", destination: "/" },
].map((r) => ({ ...r, permanent: true }));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return legacyRedirects;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
