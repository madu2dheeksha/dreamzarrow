"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { site } from "@/content/site";
import { buttonClasses } from "./ui";

/** Google Maps is only loaded on request, keeping the page fast and cookie-free by default. */
export function MapEmbed() {
  const [active, setActive] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-line bg-sand sm:aspect-[16/10]">
      {active ? (
        <iframe
          src={site.mapEmbedUrl}
          title={`Map showing the ${site.name} office in ${site.address.locality}`}
          className="absolute inset-0 size-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <MapPin className="mx-auto size-8 text-brass" aria-hidden />
            <p className="mt-3 font-display text-xl">
              {site.address.lines[1]}, {site.address.locality}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => setActive(true)} className={buttonClasses("primary")}>
                Show map
              </button>
              <a href={site.mapLinkUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
