import Image from "next/image";
import Link from "next/link";
import mark from "../../public/images/logo-mark.png";

export function Logo({ tone = "dark", onNavigate }: { tone?: "dark" | "light"; onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onNavigate={onNavigate}
      className="flex items-center gap-3"
    >
      <Image src={mark} alt="" width={52} height={27} loading="eager" className="h-[27px] w-auto" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[1.2rem] tracking-[-0.01em] ${tone === "light" ? "text-ivory" : "text-ink"}`}
        >
          DreaamzArrow
        </span>{" "}
        <span
          className={`mt-1 text-[0.6rem] font-bold uppercase tracking-[0.32em] ${tone === "light" ? "text-sun" : "text-brass"}`}
        >
          Homes
        </span>
      </span>
    </Link>
  );
}
