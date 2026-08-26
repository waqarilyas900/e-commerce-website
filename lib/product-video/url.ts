export type ProductReelItem = {
  videoUrl: string;
  productName: string;
  productHref: string;
  posterUrl?: string | null;
};

export type ProductVideoSource =
  | { kind: "direct"; src: string }
  | { kind: "instagram"; embedUrl: string; pageUrl: string; code: string };

function normalizeIgKind(raw: string): "reel" | "p" | "tv" | null {
  if (raw === "reel" || raw === "reels") return "reel";
  if (raw === "p") return "p";
  if (raw === "tv") return "tv";
  return null;
}

/** Instagram share / reel / post shortcode from path. */
export function extractInstagramCode(
  pathname: string,
): { kind: "reel" | "p" | "tv"; code: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const kind0 = normalizeIgKind(parts[0] ?? "");
  if (kind0 && parts[1]) return { kind: kind0, code: parts[1] };

  if (parts[0] === "share") {
    const kind1 = normalizeIgKind(parts[1] ?? "");
    if (kind1 && parts[2]) return { kind: kind1, code: parts[2] };
  }

  if (parts.length >= 3) {
    const kind1 = normalizeIgKind(parts[1] ?? "");
    if (kind1 && parts[2]) return { kind: kind1, code: parts[2] };
  }

  return null;
}

/**
 * Accepts:
 * - Direct store media: .mp4 / .webm / .mov / .m3u8
 * - Instagram reel/post URLs (including /reels/)
 *
 * Rejects YouTube and Facebook (not supported for this player).
 */
export function parseProductVideoSource(
  input: string | null | undefined,
): ProductVideoSource | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (
    host.includes("youtube.com") ||
    host === "youtu.be" ||
    host.includes("facebook.com") ||
    host === "fb.watch" ||
    host === "fb.com"
  ) {
    return null;
  }

  if (host === "instagram.com" || host === "instagr.am") {
    const extracted = extractInstagramCode(url.pathname);
    if (!extracted) return null;
    const pageUrl = `https://www.instagram.com/${extracted.kind}/${extracted.code}/`;
    return {
      kind: "instagram",
      code: extracted.code,
      pageUrl,
      embedUrl: `https://www.instagram.com/${extracted.kind}/${extracted.code}/embed/`,
    };
  }

  const path = url.pathname.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i.test(path)) {
    return { kind: "direct", src: url.toString() };
  }
  if (/[?&](format|type|ext)=(mp4|webm|mov|m3u8|video)/i.test(url.search)) {
    return { kind: "direct", src: url.toString() };
  }

  return null;
}

export function parseNativeProductVideoUrl(
  input: string | null | undefined,
): string | null {
  const s = parseProductVideoSource(input);
  return s ? input!.trim() : null;
}

export function parseProductVideoUrl(input: string | null | undefined): string | null {
  return parseNativeProductVideoUrl(input);
}
