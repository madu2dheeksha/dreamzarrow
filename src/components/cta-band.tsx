import Image from "next/image";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { ButtonLink, Eyebrow, buttonClasses } from "./ui";
import { site, telLink, whatsappLink } from "@/content/site";
import towers from "../../public/images/towers.webp";

export function CtaBand({
  title = "Tell us what you are looking for.",
  body = "A short conversation is the fastest way to a good shortlist. Share your brief and we will come back to you with homes that genuinely fit.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink py-24 text-ivory sm:py-32">
      <Image
        src={towers}
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[50%_30%] opacity-35"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
      <div className="container-site">
        <div className="max-w-2xl" data-reveal>
          <Eyebrow>Start a conversation</Eyebrow>
          <h2 className="mt-5 text-display-lg">{title}</h2>
          <p className="mt-6 text-[1.08rem] leading-relaxed text-ivory/80">{body}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href="/contact#enquire" variant="gold" size="lg">
              Book a consultation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </ButtonLink>
            <a
              href={whatsappLink("Hello DreaamzArrow Homes, I'd like some help with a property.")}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("ghost-light", "lg")}
            >
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
            <a href={telLink} className={buttonClasses("ghost-light", "lg")}>
              <Phone className="size-4" aria-hidden />
              {site.phone.display}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
