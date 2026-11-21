"use client";

import { useEffect } from "react";
import { Eyebrow, buttonClasses } from "@/components/ui";
import { site, telLink } from "@/content/site";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center pt-32 pb-24">
      <div className="container-site max-w-2xl">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1 className="mt-5 text-display-md">Sorry, this page could not be loaded.</h1>
        <p className="mt-5 text-muted">
          Please try again. If the problem continues, call us on{" "}
          <a href={telLink} className="font-semibold text-ink underline underline-offset-4">
            {site.phone.display}
          </a>
          .
        </p>
        <button type="button" onClick={reset} className={`mt-8 ${buttonClasses("primary")}`}>
          Try again
        </button>
      </div>
    </section>
  );
}
