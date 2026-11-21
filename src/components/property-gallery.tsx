"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import type { PropertyImage } from "@/content/properties";

export function PropertyGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const open = (i: number, el: HTMLElement) => {
    openerRef.current = el;
    setIndex(i);
  };
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i == null ? i : (i + d + count) % count)), [count]);

  // Close if the page is hidden by navigation (Activity).
  useLayoutEffect(() => () => setIndex(null), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (index != null && !d.open) d.showModal();
    if (index == null && d.open) {
      d.close();
      openerRef.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  if (count === 0) return null;
  const [first, ...rest] = images;
  const side = rest.slice(0, 4);

  return (
    <>
      <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[min(68vh,40rem)]">
        <button
          type="button"
          onClick={(e) => open(0, e.currentTarget)}
          className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand md:col-span-2 md:row-span-2 md:aspect-auto"
          aria-label={`Open photo 1 of ${count}`}
        >
          <Image
            src={first.src}
            alt={`${title} — photo 1`}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 hover:scale-[1.02]"
          />
        </button>
        {side.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={(e) => open(i + 1, e.currentTarget)}
            className="relative hidden overflow-hidden rounded-[var(--radius-card)] bg-sand md:block"
            aria-label={`Open photo ${i + 2} of ${count}`}
          >
            <Image
              src={img.src}
              alt={`${title} — photo ${i + 2}`}
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>
      {count > 1 && (
        <button
          type="button"
          onClick={(e) => open(0, e.currentTarget)}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <Images className="size-4" aria-hidden />
          View all {count} photos
        </button>
      )}

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-label={`${title} photos`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/97 p-0 text-ivory backdrop:bg-ink/80"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {index != null && (
          <div className="on-dark flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-sm text-muted-dark" aria-live="polite">
                {index + 1} / {count}
              </p>
              <button
                type="button"
                onClick={close}
                className="grid size-11 place-items-center rounded-full hover:bg-ivory/10"
                aria-label="Close gallery"
                autoFocus
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <Image
                key={images[index].src}
                src={images[index].src}
                alt={`${title} — photo ${index + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink sm:left-6"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink sm:right-6"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-4 sm:px-6">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className="relative h-14 w-20 shrink-0 overflow-hidden rounded-sm opacity-50 transition-opacity hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-sun"
                >
                  <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
