"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Loads the YouTube player only after the visitor asks for it. */
export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const [active, setActive] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 size-full"
          aria-label={`Play video: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnail, loaded lazily */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-18 place-items-center rounded-full bg-ivory/95 text-ink shadow-lift transition-transform duration-300 group-hover:scale-105">
              <Play className="ml-1 size-7 fill-current" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
