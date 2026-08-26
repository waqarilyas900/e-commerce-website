export type ProductVideoSource =
  | { kind: "youtube"; id: string; embedUrl: string; pageUrl: string }
  | { kind: "facebook"; embedUrl: string; pageUrl: string }
  | { kind: "instagram"; embedUrl: string; pageUrl: string; code: string }
  | { kind: "direct"; src: string; pageUrl: string };

export type ProductReelItem = {
  videoUrl: string;
  productName: string;
  productHref: string;
  /** Product card image — used when social embeds can't autoplay in the mini widget. */
  posterUrl?: string | null;
};

function stripQueryAndHash(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function youtubeEmbed(id: string, opts?: { autoplay?: boolean }): string {
  const autoplay = opts?.autoplay !== false;
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "1",
    loop: "1",
    playlist: id,
    playsinline: "1",
    controls: "0",
    modestbranding: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function extractYoutubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/live/")) {
        return u.pathname.split("/")[2] || null;
      }
      const v = u.searchParams.get("v");
      return v || null;
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const path = u.pathname.toLowerCase();
    return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path);
  } catch {
    return false;
  }
}

function normalizeIgKind(raw: string): "reel" | "p" | "tv" | null {
  if (raw === "reel" || raw === "reels") return "reel";
  if (raw === "p") return "p";
  if (raw === "tv") return "tv";
  return null;
}

/** Extract Instagram reel/post shortcode from common share URL shapes. */
export function extractInstagramCode(
  pathname: string,
): { kind: "reel" | "p" | "tv"; code: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  // /reel/CODE, /reels/CODE, /p/CODE, /tv/CODE
  const kind0 = normalizeIgKind(parts[0] ?? "");
  if (kind0 && parts[1]) {
    return { kind: kind0, code: parts[1] };
  }

  // /share/reel/CODE or /share/reels/CODE
  if (parts[0] === "share") {
    const kind1 = normalizeIgKind(parts[1] ?? "");
    if (kind1 && parts[2]) return { kind: kind1, code: parts[2] };
  }

  // /username/reel/CODE
  if (parts.length >= 3) {
    const kind1 = normalizeIgKind(parts[1] ?? "");
    if (kind1 && parts[2]) return { kind: kind1, code: parts[2] };
  }

  return null;
}

/**
 * Normalize admin-pasted YouTube / Facebook / Instagram / direct MP4 URLs
 * into a playable embed (or native video src).
 *
 * Note: Instagram/Facebook official embeds do not support muted autoplay;
 * use YouTube or a direct MP4 for Rad-style looping sticky reels.
 */
export function parseProductVideoUrl(input: string | null | undefined): ProductVideoSource | null {
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

  const pageUrl = stripQueryAndHash(url.toString());
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  const ytId = extractYoutubeId(url.toString());
  if (ytId) {
    return {
      kind: "youtube",
      id: ytId,
      embedUrl: youtubeEmbed(ytId),
      pageUrl: `https://www.youtube.com/watch?v=${ytId}`,
    };
  }

  if (
    host === "facebook.com" ||
    host === "m.facebook.com" ||
    host === "fb.watch" ||
    host === "fb.com" ||
    host.endsWith(".facebook.com")
  ) {
    const encoded = encodeURIComponent(url.toString());
    return {
      kind: "facebook",
      pageUrl,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true&mute=1&width=320`,
    };
  }

  if (host === "instagram.com" || host === "instagr.am") {
    const extracted = extractInstagramCode(url.pathname);
    if (extracted) {
      const cleanPage = `https://www.instagram.com/${extracted.kind}/${extracted.code}/`;
      return {
        kind: "instagram",
        code: extracted.code,
        pageUrl: cleanPage,
        // Official embed uses singular /reel/ even when share URL was /reels/
        embedUrl: `https://www.instagram.com/${extracted.kind}/${extracted.code}/embed/`,
      };
    }
  }

  if (isDirectMediaUrl(url.toString())) {
    return { kind: "direct", src: url.toString(), pageUrl };
  }

  return null;
}

/** True when the source can muted-autoplay in the sticky mini player. */
export function productVideoCanAutoplay(source: ProductVideoSource): boolean {
  return source.kind === "youtube" || source.kind === "direct";
}
