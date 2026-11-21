import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Maximize } from "lucide-react";
import { formatPrice, listingLabel, typeLabel, type PropertySummary } from "@/lib/property-utils";

export function PropertyCard({
  property: p,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  property: PropertySummary;
  priority?: boolean;
  sizes?: string;
}) {
  const cover = p.image;
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
        {cover && (
          <Image
            src={cover.src}
            alt={`${p.title}${p.community ? ` at ${p.community}` : ""}`}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[0.7rem] font-bold tracking-[0.08em] uppercase ${
              p.listing === "rent" ? "bg-ivory/95 text-ink" : "bg-ink/90 text-ivory"
            }`}
          >
            {listingLabel(p.listing)}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="text-[0.72rem] font-bold tracking-[0.14em] text-brass uppercase">
          {p.locality} · {typeLabel(p.propertyType)}
        </p>
        <h3 className="mt-2 font-display text-[1.35rem] leading-snug">
          <Link href={`/properties/${p.slug}`} className="after:absolute after:inset-0">
            {p.community ?? p.title}
          </Link>
        </h3>
        <p className="mt-1 mb-5 text-[0.92rem] text-muted">{p.title}</p>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-muted" aria-label="Key facts">
            <li className="flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden />
              {p.bedrooms} bed
            </li>
            {p.bathrooms != null && (
              <li className="flex items-center gap-1.5">
                <Bath className="size-4" aria-hidden />
                {p.bathrooms} bath
              </li>
            )}
            {p.areaSqft && (
              <li className="flex items-center gap-1.5">
                <Maximize className="size-4" aria-hidden />
                {p.areaSqft.toLocaleString("en-IN")} sq ft
              </li>
            )}
          </ul>
          <p className="shrink-0 text-right text-[0.9rem] font-semibold">{formatPrice(p)}</p>
        </div>
      </div>
    </article>
  );
}
