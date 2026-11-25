import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";

/** Pending follow-ups (manual reminders and handover tasks), soonest first, with the lead's name. */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  const { data, error } = await requireDb()
    .from("followups")
    .select("*, leads(id, customer_name, phone_number, lead_category, assigned_salesperson)")
    .eq("followup_status", ["pending", "done", "sent", "failed", "cancelled", "skipped"].includes(status) ? status : "pending")
    .order("followup_date", { ascending: status === "pending" })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ followups: data ?? [] });
}
