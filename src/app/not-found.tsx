import Link from "next/link";
import { ButtonLink, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="flex min-h-[80vh] items-center pt-32 pb-24">
      <div className="container-site max-w-2xl">
        <Eyebrow>Page not found</Eyebrow>
        <h1 className="mt-5 text-display-lg">This page has moved or no longer exists.</h1>
        <p className="mt-6 text-[1.05rem] leading-relaxed text-muted">
          If you followed a link to a property, it may have been let or sold. Browse current homes, or tell us what you
          are looking for.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/properties">View current properties</ButtonLink>
          <ButtonLink href="/contact#enquire" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
        <p className="mt-10 text-sm text-muted">
          Or return to the <Link href="/" className="font-semibold text-ink underline underline-offset-4">home page</Link>.
        </p>
      </div>
    </section>
  );
}

export const metadata = { title: "Page not found", robots: { index: false } };
