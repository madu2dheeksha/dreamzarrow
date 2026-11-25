import type { NextRequest } from "next/server";
import sharp from "sharp";
import { getProperty } from "@/content/properties";

/**
 * Serves a listing photo as JPEG for WhatsApp: image messages accept JPEG/PNG only,
 * while the website stores WebP. Only real listing photos can be requested.
 * Responses are cached by the CDN, so each photo is converted once.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/media/whatsapp/[slug]/[index]">) {
  const { slug, index } = await ctx.params;
  const p = getProperty(slug);
  const i = Number(index);
  const img = p && Number.isInteger(i) && i >= 0 ? p.images[i] : undefined;
  if (!img) return new Response("Not found", { status: 404 });

  const res = await fetch(new URL(img.src, request.nextUrl.origin), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return new Response("Not found", { status: 404 });
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}
