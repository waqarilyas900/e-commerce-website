import { extractInstagramCode } from "@/lib/product-video/url";

const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function unescapeIgUrl(raw: string): string {
  let url = raw;
  // Embed HTML double-escapes slashes: https:\\\/\\\/host\\\/path.mp4?...
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
  // Keep query string; stop at JSON delimiters / escapes that end the string value.
  while (end < slice.length) {
    const c = slice[end];
    if (c === '"' || c === "'" || c === "," || c === "}" || c === " " || c === "\n" || c === "\\") {
      // Allow \\/ sequences inside the value — skip paired escapes.
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

  const raw = slice.slice(httpsIdx, end);
  const url = unescapeIgUrl(raw);
  if (!/^https:\/\/.+\.mp4(\?|$)/i.test(url)) return null;
  return url;
}

/**
 * Resolve a public Instagram reel/post to a direct CDN MP4 URL (server-side only).
 * Uses the embed document which still exposes `video_url` for public media.
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

  const candidates = [
    `https://www.instagram.com/reel/${extracted.code}/embed/captioned/`,
    `https://www.instagram.com/reel/${extracted.code}/embed/`,
    `https://www.instagram.com/p/${extracted.code}/embed/captioned/`,
    `https://www.instagram.com/${extracted.kind}/${extracted.code}/embed/captioned/`,
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
        next: { revalidate: 1800 },
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
