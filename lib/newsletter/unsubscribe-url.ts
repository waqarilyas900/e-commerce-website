import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * Append to marketing / newsletter email footers. Load `unsubscribe_token` from
 * `newsletter_subscriptions` for each recipient where `subscribed = true`.
 */
export function newsletterUnsubscribeUrl(token: string): string {
  const base = getPublicSiteUrl();
  const q = new URLSearchParams({ token });
  return `${base}/newsletter/unsubscribe?${q.toString()}`;
}

/** Re-opt-in link (separate token). Use `resubscribe_token` from `newsletter_subscriptions`. */
export function newsletterResubscribeUrl(token: string): string {
  const base = getPublicSiteUrl();
  const q = new URLSearchParams({ token });
  return `${base}/newsletter/resubscribe?${q.toString()}`;
}
