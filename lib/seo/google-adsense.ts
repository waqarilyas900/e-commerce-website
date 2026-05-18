/**
 * Google AdSense publisher id (numeric segment after `pub-`).
 * Used by `layout.tsx` (script + meta) and `/ads.txt` (IAB ads.txt).
 */
export const GOOGLE_ADSENSE_PUBLISHER_NUMERIC = "9696696438221700";

export const GOOGLE_ADSENSE_CLIENT_ID = `ca-pub-${GOOGLE_ADSENSE_PUBLISHER_NUMERIC}`;

/** IAB ads.txt line for Google Ad Manager / AdSense (DIRECT + Google cert id). */
export function googleAdsTxtBody(): string {
  return `google.com, pub-${GOOGLE_ADSENSE_PUBLISHER_NUMERIC}, DIRECT, f08c47fec0942fa0\n`;
}
