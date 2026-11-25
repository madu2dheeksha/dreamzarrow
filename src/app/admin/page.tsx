import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/admin-app";

export const metadata: Metadata = {
  title: "Lead dashboard",
  robots: { index: false, follow: false },
};

/** Staff-only dashboard. The page shell is public; every data call is authorised on the server. */
export default function AdminPage() {
  return <AdminApp />;
}
