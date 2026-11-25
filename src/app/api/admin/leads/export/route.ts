import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/automation/admin-auth";
import { csvCell, leadQuery } from "@/lib/automation/admin-queries";

const COLUMNS = [
  "id",
  "customer_name",
  "phone_number",
  "email",
  "enquiry_source",
  "enquiry_intent",
  "property_interest",
  "property_type",
  "budget",
  "preferred_location",
  "configuration",
  "furnishing",
  "possession",
  "buying_timeline",
  "customer_requirements",
  "preferred_callback_time",
  "lead_status",
  "lead_category",
  "lead_score",
  "assigned_salesperson",
  "human_handover",
  "handover_reason",
  "whatsapp_consent",
  "opted_out",
  "ai_summary",
  "last_inbound_at",
  "created_at",
  "updated_at",
];

export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await leadQuery(request.nextUrl.searchParams, COLUMNS.join(", ")).range(page * 1000, page * 1000 + 999);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows.push(...((data as unknown as Record<string, unknown>[]) ?? []));
    if (!data || data.length < 1000) break;
  }
  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dreaamzarrow-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
