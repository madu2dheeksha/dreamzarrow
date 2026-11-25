import "server-only";
import { db, type Staff } from "./db";

/**
 * Authorises /api/admin/* calls. The dashboard signs in with Supabase Auth in the
 * browser and sends the access token as a Bearer header. We verify the token with
 * Supabase, then require an active row in `staff`. Roles: owner (everything) and
 * sales (leads and conversations; no team or listing management).
 */
export async function requireStaff(
  request: Request,
  roles: Staff["role"][] = ["owner", "sales"],
): Promise<{ staff: Staff } | { response: Response }> {
  const sb = db();
  if (!sb) return { response: Response.json({ error: "database_not_configured" }, { status: 503 }) };
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };

  const { data: staff } = await sb.from("staff").select("*").eq("id", data.user.id).maybeSingle();
  if (!staff || !(staff as Staff).active) return { response: Response.json({ error: "forbidden" }, { status: 403 }) };
  if (!roles.includes((staff as Staff).role)) return { response: Response.json({ error: "forbidden" }, { status: 403 }) };
  return { staff: staff as Staff };
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Admin JSON bodies are small; cap them and parse safely. */
export async function readJson(request: Request, max = 20_000): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > max) throw new Error("too_large");
  return raw ? JSON.parse(raw) : {};
}
