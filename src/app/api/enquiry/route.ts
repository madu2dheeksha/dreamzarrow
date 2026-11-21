import { NextResponse, type NextRequest } from "next/server";
import { enquirySchema, fieldErrorsFrom, type EnquiryResponse } from "@/lib/enquiry-schema";
import { deliverLead } from "@/lib/lead-delivery";
import { rateLimit, rememberSubmission } from "@/lib/rate-limit";

const json = (body: EnquiryResponse, status = 200) => NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  // Only accept same-origin JSON posts from the site's own forms.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return json({ ok: false, error: "bad_request" }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ ok: false, error: "bad_request" }, 415);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return json({ ok: false, error: "bad_request" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: bots fill every field. Pretend success, deliver nothing.
  if (typeof body === "object" && body && "company" in body && (body as { company?: string }).company) {
    return json({ ok: true });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) }, 422);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`enquiry:${ip}`, 5, 10 * 60_000)) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  // Duplicate submission (double click, retry after a slow network) — already handled.
  if (!rememberSubmission(parsed.data.submissionId)) {
    return json({ ok: true });
  }

  const result = await deliverLead(parsed.data);
  if (result === "ok") return json({ ok: true });

  // Allow the same submission to be retried after a failure.
  rememberSubmission(parsed.data.submissionId, true);
  if (result === "not_configured") return json({ ok: false, error: "not_configured" }, 503);
  return json({ ok: false, error: "delivery_failed" }, 502);
}
