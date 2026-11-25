"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The staff dashboard at /admin has its own chrome; hide the public site's header, footer and chat button there. */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname?.startsWith("/admin/")) return null;
  return <>{children}</>;
}
