/**
 * Social URLs for footer / mobile nav.
 * Icons always render; missing env vars fall back to configured brand handles.
 */

const DEFAULT_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61593870744153";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/simplecartstore/";
const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/@simplecartstore";

function readPublicUrl(envKey: string, fallback = "#"): string {
  const v = process.env[envKey]?.trim();
  return v && v.length > 0 ? v : fallback;
}

export function getPublicInstagramUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_INSTAGRAM_URL", DEFAULT_INSTAGRAM_URL);
}

export function getPublicFacebookUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_FACEBOOK_URL", DEFAULT_FACEBOOK_URL);
}

export function getPublicTikTokUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_TIKTOK_URL", "#");
}

export function getPublicWhatsAppUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_WHATSAPP_URL", "#");
}

export function getPublicYouTubeUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_YOUTUBE_URL", DEFAULT_YOUTUBE_URL);
}

export type PublicSocialLink = {
  id: "facebook" | "instagram" | "tiktok" | "whatsapp" | "youtube";
  label: string;
  href: string;
  /** True when env is empty / placeholder — UI keeps the icon but link is inactive. */
  placeholder: boolean;
};

export function getPublicSocialLinks(): PublicSocialLink[] {
  const row = (
    id: PublicSocialLink["id"],
    label: string,
    href: string,
  ): PublicSocialLink => ({
    id,
    label,
    href,
    placeholder: !href || href === "#",
  });

  return [
    row("facebook", "Facebook", getPublicFacebookUrl()),
    row("instagram", "Instagram", getPublicInstagramUrl()),
    row("youtube", "YouTube", getPublicYouTubeUrl()),
    row("tiktok", "TikTok", getPublicTikTokUrl()),
    row("whatsapp", "WhatsApp", getPublicWhatsAppUrl()),
  ];
}
