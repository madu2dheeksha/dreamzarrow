import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "light" | "gold" | "ghost-light";
type Size = "md" | "lg";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = "") {
  const base =
    "group inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-card)] font-semibold tracking-[0.01em] transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
  const sizes: Record<Size, string> = {
    md: "min-h-11 px-5 text-[0.9rem]",
    lg: "min-h-13 px-7 text-[0.95rem]",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-ink text-ivory hover:bg-ink-soft hover:shadow-lift",
    secondary: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-ivory",
    light: "bg-ivory text-ink hover:bg-paper hover:shadow-lift",
    gold: "bg-sun text-ink hover:bg-[#f7c64a] hover:shadow-lift",
    "ghost-light": "border border-ivory/40 text-ivory hover:border-ivory hover:bg-ivory hover:text-ink",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function ButtonLink({
  variant,
  size,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClasses(variant, size, className)} />;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: As = "h2",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      data-reveal
      className={`${align === "center" ? "mx-auto text-center [&_.eyebrow]:justify-center" : ""} max-w-3xl ${className}`}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <As className={`mt-4 ${As === "h1" ? "text-display-lg" : "text-display-md"}`}>{title}</As>
      {intro && <div className="mt-5 text-[1.05rem] leading-relaxed text-muted on-dark:text-muted-dark">{intro}</div>}
    </div>
  );
}
