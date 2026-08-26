export type ProductVideoSource =
  | { kind: "youtube"; id: string; embedUrl: string; pageUrl: string }
  | { kind: "facebook"; embedUrl: string; pageUrl: string }
  | { kind: "instagram"; embedUrl: string; pageUrl: string }
  | { kind: "direct"; src: string; pageUrl: string };

function stripQueryAndHash(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function youtubeEmbed(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
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

/**
 * Normalize admin-pasted YouTube / Facebook / Instagram / direct MP4 URLs
 * into a playable embed (or native video src).
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

  if (host === "instagram.com" || host === "www.instagram.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const kind = parts[0];
    const code = parts[1];
    if (code && (kind === "reel" || kind === "p" || kind === "tv")) {
      return {
        kind: "instagram",
        pageUrl,
        embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
      };
    }
    return {
      kind: "instagram",
      pageUrl,
      embedUrl: pageUrl.endsWith("/") ? `${pageUrl}embed/` : `${pageUrl}/embed/`,
    };
  }

  if (isDirectMediaUrl(url.toString())) {
    return { kind: "direct", src: url.toString(), pageUrl };
  }

  return null;
}
