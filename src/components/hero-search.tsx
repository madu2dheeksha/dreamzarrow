import Form from "next/form";
import { Search } from "lucide-react";
import { localities, bhkOptions } from "@/content/properties";

/** A plain GET form — works before JavaScript loads, then navigates client-side. */
export function HeroSearch() {
  return (
    <Form
      action="/properties"
      className="grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line text-ink shadow-lift sm:grid-cols-[auto_1fr_1fr_auto]"
      aria-label="Search properties"
    >
      <fieldset className="flex bg-paper p-2">
        <legend className="sr-only">Buy or rent</legend>
        {[
          { v: "sale", l: "Buy" },
          { v: "rent", l: "Rent" },
        ].map((o, i) => (
          <label key={o.v} className="flex-1 cursor-pointer">
            <input type="radio" name="listing" value={o.v} defaultChecked={i === 0} className="peer sr-only" />
            <span className="flex h-full min-h-12 items-center justify-center rounded-[3px] px-5 text-sm font-semibold text-muted transition-colors peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
              {o.l}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="bg-paper px-4 py-2.5 focus-within:shadow-[inset_0_0_0_2px_var(--color-brass)]">
        <label htmlFor="hero-locality" className="block text-[0.68rem] font-bold tracking-[0.14em] text-brass uppercase">
          Neighbourhood
        </label>
        <select id="hero-locality" name="locality" className="w-full appearance-none bg-transparent py-1 text-[0.95rem] font-medium focus:outline-none" defaultValue="">
          <option value="">All of West Hyderabad</option>
          {localities.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-paper px-4 py-2.5 focus-within:shadow-[inset_0_0_0_2px_var(--color-brass)]">
        <label htmlFor="hero-bhk" className="block text-[0.68rem] font-bold tracking-[0.14em] text-brass uppercase">
          Size
        </label>
        <select id="hero-bhk" name="bhk" className="w-full appearance-none bg-transparent py-1 text-[0.95rem] font-medium focus:outline-none" defaultValue="">
          <option value="">Any size</option>
          {bhkOptions.map((b) => (
            <option key={b} value={b}>
              {b} BHK
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="flex min-h-14 items-center justify-center gap-2 bg-sun px-7 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-[#f7c64a] focus-visible:outline-offset-[-4px] focus-visible:outline-ink"
      >
        <Search className="size-4" aria-hidden />
        Search
      </button>
    </Form>
  );
}
