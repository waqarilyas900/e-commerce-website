import { NextRequest } from "next/server";
import { resolveInstagramCdnVideoUrl } from "@/lib/product-video/resolve-instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

/**
 * Same-origin video stream for Instagram reels.
 * Browser plays `/api/product-video/stream?code=…` as a normal <video> (autoplay/mute/loop),
 * with no Instagram UI — we proxy the CDN bytes server-side.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{5,64}$/.test(code)) {
    return new Response("Invalid code", { status: 400 });
  }

  const pageUrl = `https://www.instagram.com/reel/${code}/`;
  const cdnUrl = await resolveInstagramCdnVideoUrl(pageUrl);
  if (!cdnUrl) {
    return new Response("Could not resolve Instagram video", { status: 502 });
  }

  const range = req.headers.get("range") ?? undefined;
  const upstream = await fetch(cdnUrl, {
    headers: {
      "User-Agent": IG_UA,
      Accept: "*/*",
      ...(range ? { Range: range } : {}),
      Referer: "https://www.instagram.com/",
    },
    // Don't cache the binary proxy response in Next data cache.
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Upstream video failed", { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || "video/mp4";
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=1800, stale-while-revalidate=3600");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
