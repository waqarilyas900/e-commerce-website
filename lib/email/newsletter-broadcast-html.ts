import { newsletterResubscribeUrl, newsletterUnsubscribeUrl } from "@/lib/newsletter/unsubscribe-url";

/** Appends compliance links to admin-composed marketing HTML (per-recipient tokens). */
export function wrapNewsletterBroadcastHtml(
  innerHtml: string,
  tokens: { unsubscribeToken: string; resubscribeToken: string },
): string {
  const unsub = newsletterUnsubscribeUrl(tokens.unsubscribeToken);
  const resub = newsletterResubscribeUrl(tokens.resubscribeToken);
  return (
    `${innerHtml}<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0" />` +
    `<p style="font-size:12px;color:#737373;line-height:1.6">` +
    `<a href="${unsub}" style="color:#171717">Unsubscribe</a> · ` +
    `<a href="${resub}" style="color:#171717">Subscribe again</a>` +
    `</p>`
  );
}
