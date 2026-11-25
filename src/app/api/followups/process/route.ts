import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { cronSecret } from "@/lib/automation/config";
import { db } from "@/lib/automation/db";
import { processDueFollowups } from "@/lib/automation/followups";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = cronSecret();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called once a day by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`. */
async function run(request: NextRequest) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db()) return Response.json({ ok: false, error: "database_not_configured" }, { status: 503 });
  try {
    const report = await processDueFollowups();
    console.info("[followups]", JSON.stringify(report));
    return Response.json({ ok: true, ...report });
  } catch (e) {
    console.error("[followups] run failed:", e);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
