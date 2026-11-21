import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionHeading } from "@/components/ui";
import { PropertyExplorer, PropertyGrid } from "@/components/property-explorer";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { bhkOptions, localities, properties, toSummary } from "@/content/properties";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Apartments & villas for sale and rent in West Hyderabad",
  description: `Browse ${properties.length} premium apartments and villas for sale and rent in Kokapet, Kondapur, Narsingi, HITEC City, Gachibowli and the Financial District. Visit any home with our team.`,
  alternates: { canonical: "/properties" },
};

export default function PropertiesPage() {
  const items = properties.map(toSummary);
  return (
    <>
      <section className="pt-36 pb-12 sm:pt-44">
        <div className="container-site">
          <SectionHeading
            as="h1"
            eyebrow="Properties"
            title="Homes for sale and rent across West Hyderabad."
            intro="Apartments and villas in established gated communities. Every home can be visited with our team. Where a price is not shown, ask us and we will share current terms."
          />
        </div>
      </section>
      <section className="pb-24 sm:pb-32">
        <div className="container-site">
          {/* Filters read the URL on the client; the full list is prerendered for search engines and no-JS visitors. */}
          <Suspense
            fallback={
              <>
                <p className="mb-8 text-[0.95rem] text-muted">
                  <span className="font-semibold text-ink">{items.length}</span> homes currently listed
                </p>
                <PropertyGrid items={items} />
              </>
            }
          >
            <PropertyExplorer items={items} localities={localities} bhkOptions={bhkOptions} />
          </Suspense>
        </div>
      </section>
      <CtaBand
        title="Not seeing the right home?"
        body="Our listings change often. Tell us your brief and we will search the market on your behalf."
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Properties", path: "/properties" },
        ])}
      />
    </>
  );
}
