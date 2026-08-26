export type ProductReelItem = {
  /** Direct store video URL (MP4 / WebM / MOV / HLS .m3u8) — not Instagram/YouTube embeds. */
  videoUrl: string;
  productName: string;
  productHref: string;
  posterUrl?: string | null;
};

/**
 * Only native media URLs play in the Rad-style reels player.
 * Instagram / YouTube / Facebook page URLs are rejected — paste a direct .mp4 / .m3u8 link.
 */
export function parseNativeProductVideoUrl(
  input: string | null | undefined,
): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    href = `https://${href}`;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (
    host.includes("instagram.com") ||
    host === "instagr.am" ||
    host.includes("youtube.com") ||
    host === "youtu.be" ||
    host.includes("facebook.com") ||
    host === "fb.watch" ||
    host === "fb.com"
  ) {
    return null;
  }

  const path = url.pathname.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i.test(path)) {
    return url.toString();
  }

  // Some CDNs put the extension only in a query param.
  if (/[?&](format|type|ext)=(mp4|webm|mov|m3u8|video)/i.test(url.search)) {
    return url.toString();
  }

  return null;
}

/** Alias used by older call sites. */
export function parseProductVideoUrl(input: string | null | undefined): string | null {
  return parseNativeProductVideoUrl(input);
}
