"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Adds a subtle fade-up to elements marked with `data-reveal` as they enter
 * the viewport. Content is fully visible without JavaScript, and the CSS only
 * animates when the visitor has not asked for reduced motion.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    // Anything already on screen stays put — only content below the fold animates.
    document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
    });
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () =>
      document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
