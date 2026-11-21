"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PropertyCard } from "./property-card";
import { buttonClasses } from "./ui";
import { slugifyLocality, type PropertySummary } from "@/lib/property-utils";

type Option = { value: string; label: string };

export type ExplorerProps = {
  items: PropertySummary[];
  localities: { name: string; slug: string; count: number }[];
  bhkOptions: number[];
};

const LISTING: Option[] = [
  { value: "", label: "All" },
  { value: "sale", label: "Buy" },
  { value: "rent", label: "Rent" },
];

/*
 * Filters live in the query string. Reading it with useSyncExternalStore
 * (rather than useSearchParams) lets the server-rendered grid hydrate in place
 * instead of being swapped out of a Suspense fallback, which keeps the listing
 * photos stable for Largest Contentful Paint. Updates use the native History
 * API, which Next.js keeps in sync with its router.
 */
const URL_EVENT = "explorer:urlchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}

function useQueryString() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}

export function filterProperties(items: PropertySummary[], params: URLSearchParams) {
  const listing = params.get("listing");
  const locality = params.get("locality");
  const bhk = params.get("bhk");
  const type = params.get("type");
  const sort = params.get("sort");
  const out = items.filter(
    (p) =>
      (!listing || p.listing === listing) &&
      (!locality || slugifyLocality(p.locality) === locality) &&
      (!bhk || String(p.bhk) === bhk) &&
      (!type || p.propertyType === type),
  );
  if (sort === "bedrooms") out.sort((a, b) => b.bedrooms - a.bedrooms);
  return out;
}

export function PropertyGrid({ items }: { items: PropertySummary[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p, i) => (
        <li key={p.slug} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 3) * 80}ms` }}>
          <PropertyCard property={p} priority={i < 3} />
        </li>
      ))}
    </ul>
  );
}

export function PropertyExplorer({ items, localities, bhkOptions }: ExplorerProps) {
  const search = useQueryString();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const results = useMemo(() => filterProperties(items, params), [items, params]);
  const active = ["listing", "locality", "bhk", "type"].some((k) => params.get(k));

  function setQuery(next: URLSearchParams) {
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    window.dispatchEvent(new Event(URL_EVENT));
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setQuery(next);
  }

  const clearAll = () => setQuery(new URLSearchParams());

  const select = (key: string, label: string, options: Option[]) => (
    <div className="min-w-0">
      <label htmlFor={`filter-${key}`} className="field-label">
        {label}
      </label>
      <select
        id={`filter-${key}`}
        className="field"
        value={params.get(key) ?? ""}
        onChange={(e) => update(key, e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden /> Refine
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-[auto_1fr_1fr_1fr_1fr] md:items-end md:gap-4">
          <fieldset className="col-span-2 md:col-span-1">
            <legend className="field-label">Looking to</legend>
            <div className="inline-flex h-12 w-full rounded-[var(--radius-card)] border border-line bg-ivory p-1 md:w-auto">
              {LISTING.map((o) => {
                const checked = (params.get("listing") ?? "") === o.value;
                return (
                  <label
                    key={o.value}
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-[3px] px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brass ${
                      checked ? "bg-ink text-ivory" : "text-muted hover:text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="listing"
                      value={o.value}
                      checked={checked}
                      onChange={() => update("listing", o.value)}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {select("locality", "Neighbourhood", [
            { value: "", label: "All neighbourhoods" },
            ...localities.map((l) => ({ value: l.slug, label: `${l.name} (${l.count})` })),
          ])}
          {select("bhk", "Size", [
            { value: "", label: "Any size" },
            ...bhkOptions.map((b) => ({ value: String(b), label: `${b} BHK` })),
          ])}
          {select("type", "Type", [
            { value: "", label: "Apartments & villas" },
            { value: "apartment", label: "Apartments" },
            { value: "villa", label: "Villas" },
          ])}
          {select("sort", "Sort by", [
            { value: "", label: "Newest first" },
            { value: "bedrooms", label: "Most bedrooms" },
          ])}
        </div>
      </div>

      <div className="mt-8 mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[0.95rem] text-muted" aria-live="polite">
          <span className="font-semibold text-ink">{results.length}</span>{" "}
          {results.length === 1 ? "home" : "homes"} {active ? "match your filters" : "currently listed"}
        </p>
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold underline underline-offset-4 hover:text-brass"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div>
        {results.length > 0 ? (
          <PropertyGrid items={results} />
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center">
            <h2 className="font-display text-2xl">No listed homes match those filters yet.</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Our listings change often. Tell us what you are looking for and we will search on your behalf.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/contact#enquire" className={buttonClasses("primary")}>
                Share your requirement
              </Link>
              <button
                type="button"
                onClick={clearAll}
                className={buttonClasses("secondary")}
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
