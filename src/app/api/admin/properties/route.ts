import { z } from "zod";
import { readJson, requireStaff } from "@/lib/automation/admin-auth";
import { requireDb } from "@/lib/automation/db";
import { invalidateAvailabilityCache } from "@/lib/automation/inventory";
import { properties } from "@/content/properties";
import { formatPrice } from "@/lib/property-utils";

/** Listings from the website file, with the availability staff have set. */
export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { data } = await requireDb().from("property_status").select("slug, availability, notes, updated_at");
  const status = new Map((data ?? []).map((r) => [r.slug, r]));
  return Response.json({
    properties: properties.map((p) => ({
      slug: p.slug,
      title: p.title,
      locality: p.locality,
      community: p.community,
      listing: p.listing,
      price: formatPrice(p),
      availability: status.get(p.slug)?.availability ?? "available",
      notes: status.get(p.slug)?.notes ?? null,
      updated_at: status.get(p.slug)?.updated_at ?? null,
    })),
  });
}

/** Owners mark listings sold / rented / under offer so the AI stops recommending them. */
export async function PATCH(request: Request) {
  const auth = await requireStaff(request, ["owner"]);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({
      slug: z.string().refine((s) => properties.some((p) => p.slug === s), "unknown listing"),
      availability: z.enum(["available", "under_offer", "sold", "rented", "hidden"]),
      notes: z.string().max(300).optional(),
    })
    .safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 422 });
  const { error } = await requireDb()
    .from("property_status")
    .upsert({ ...parsed.data, updated_by: auth.staff.id, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  invalidateAvailabilityCache();
  return Response.json({ ok: true });
}
