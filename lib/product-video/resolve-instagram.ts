import { unstable_cache } from "next/cache";
import { extractInstagramCode } from "@/lib/product-video/url";

const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

/** Process-local CDN URL cache — avoids re-scraping Instagram on every Range request. */
const cdnCache = new Map<string, { url: string; expiresAt: number }>();
const CDN_TTL_MS = 25 * 60 * 1000; // CDN tokens usually last longer; refresh under 30m
const inflight = new Map<string, Promise<string | null>>();

const cachedScrapeInstagramCdn = unstable_cache(
  async (code: string) => scrapeInstagramCdn(code),
  ["ig-cdn-video-v1"],
  { revalidate: 1500 },
);

function unescapeIgUrl(raw: string): string {
  let url = raw;
  while (url.includes("\\/")) url = url.replace(/\\\//g, "/");
  while (url.includes("\\\\")) url = url.replace(/\\\\/g, "\\");
  return url.replace(/\\u0026/g, "&").replace(/\\u003d/g, "=");
}

function extractVideoUrlFromHtml(html: string): string | null {
  const marker = html.indexOf("video_url");
  if (marker < 0) return null;
  const slice = html.slice(marker, marker + 5000);
  const httpsIdx = slice.search(/https:/i);
  if (httpsIdx < 0) return null;
  const mp4Idx = slice.indexOf(".mp4", httpsIdx);
  if (mp4Idx < 0) return null;

  let end = mp4Idx + 4;
  while (end < slice.length) {
    const c = slice[end];
    if (c === '"' || c === "'" || c === "," || c === "}" || c === " " || c === "\n" || c === "\\") {
      if (c === "\\" && slice[end + 1] === "/") {
        end += 2;
        continue;
      }
      if (c === "\\" && slice[end + 1] === "\\") {
        end += 2;
        continue;
      }
      if (c === "\\" && slice[end + 1] === "u") {
        end += 6;
        continue;
      }
      break;
    }
    end += 1;
  }

  const url = unescapeIgUrl(slice.slice(httpsIdx, end));
  if (!/^https:\/\/.+\.mp4(\?|$)/i.test(url)) return null;
  return url;
}

async function scrapeInstagramCdn(code: string): Promise<string | null> {
  // Captioned embed is the reliable source of video_url — try it first only.
  const candidates = [
    `https://www.instagram.com/reel/${code}/embed/captioned/`,
    `https://www.instagram.com/p/${code}/embed/captioned/`,
    `https://www.instagram.com/reel/${code}/embed/`,
  ];

  for (const page of candidates) {
    try {
      const res = await fetch(page, {
        headers: {
          "User-Agent": IG_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        // Cache HTML briefly at the fetch layer when available.
        next: { revalidate: 900 },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const videoUrl = extractVideoUrlFromHtml(html);
      if (videoUrl) return videoUrl;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Resolve Instagram shortcode → CDN MP4 (cached in-process).
 */
export async function resolveInstagramCdnByCode(code: string): Promise<string | null> {
  const key = code.trim();
  if (!/^[A-Za-z0-9_-]{5,64}$/.test(key)) return null;

  const hit = cdnCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    // Shared Next data cache (cross-instance) + local Map (same process / Range bursts).
    const url = await cachedScrapeInstagramCdn(key);
    if (url) {
      cdnCache.set(key, { url, expiresAt: Date.now() + CDN_TTL_MS });
    }
    return url;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
}

/**
 * Resolve a public Instagram reel/post page URL to a direct CDN MP4.
 */
export async function resolveInstagramCdnVideoUrl(
  instagramPageUrl: string,
): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(instagramPageUrl);
  } catch {
    return null;
  }
  const extracted = extractInstagramCode(url.pathname);
  if (!extracted) return null;
  return resolveInstagramCdnByCode(extracted.code);
}

/** Fire-and-forget / awaited warm so the first video byte is faster. */
export async function warmInstagramVideoResolve(code: string): Promise<void> {
  await resolveInstagramCdnByCode(code);
}
