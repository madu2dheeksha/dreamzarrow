import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/automation/admin-auth";
import { leadQuery } from "@/lib/automation/admin-queries";

const LIST_COLUMNS =
  "id, customer_name, phone_number, email, enquiry_source, enquiry_intent, property_interest, property_type, budget, preferred_location, configuration, buying_timeline, lead_status, lead_category, lead_score, assigned_salesperson, human_handover, opted_out, whatsapp_consent, last_inbound_at, last_outbound_at, created_at, updated_at";

export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const params = request.nextUrl.searchParams;
  const page = Math.max(0, Number(params.get("page")) || 0);
  const size = 50;
  const { data, count, error } = await leadQuery(params, LIST_COLUMNS).range(page * size, page * size + size - 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ leads: data, total: count ?? 0, page, pageSize: size });
}
