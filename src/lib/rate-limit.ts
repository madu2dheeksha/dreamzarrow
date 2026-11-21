import "server-only";

/**
 * Lightweight in-memory protection for the enquiry endpoint.
 * On serverless hosts each instance keeps its own memory, so this is a
 * best-effort guard against bursts and double submits — not a hard quota.
 * For stricter limits, swap in a shared store (e.g. Upstash Redis).
 */
const hits = new Map<string, number[]>();
const seen = new Map<string, number>();
const SUBMISSION_TTL = 30 * 60_000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return true;
}

/** Returns false if this submission id was already accepted recently. */
export function rememberSubmission(id: string, forget = false) {
  const now = Date.now();
  if (forget) {
    seen.delete(id);
    return true;
  }
  for (const [k, t] of seen) if (now - t > SUBMISSION_TTL) seen.delete(k);
  if (seen.has(id)) return false;
  seen.set(id, now);
  return true;
}
