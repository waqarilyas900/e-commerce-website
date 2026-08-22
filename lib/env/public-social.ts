/**
 * Social URLs for footer / mobile nav.
 * Icons always render; missing env vars use a blank `#` placeholder until you set the real URL.
 */

function readPublicUrl(envKey: string): string {
  const v = process.env[envKey]?.trim();
  return v && v.length > 0 ? v : "#";
}

export function getPublicInstagramUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_INSTAGRAM_URL");
}

export function getPublicFacebookUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_FACEBOOK_URL");
}

export function getPublicTikTokUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_TIKTOK_URL");
}

export function getPublicWhatsAppUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_WHATSAPP_URL");
}

export type PublicSocialLink = {
  id: "facebook" | "instagram" | "tiktok" | "whatsapp" | "youtube";
  label: string;
  href: string;
  /** True when env is empty — UI keeps the icon but link is a no-op placeholder. */
  placeholder: boolean;
};

export function getPublicYouTubeUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_YOUTUBE_URL");
}

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
    row("tiktok", "TikTok", getPublicTikTokUrl()),
    row("youtube", "YouTube", getPublicYouTubeUrl()),
    row("whatsapp", "WhatsApp", getPublicWhatsAppUrl()),
  ];
}
