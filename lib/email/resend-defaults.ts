/**
 * Fallback “from” when `RESEND_FROM` is unset (Resend test inbox).
 * Override with `RESEND_DEFAULT_FROM` in `.env` after verifying your domain.
 *
 * @see https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing
 */
const RESEND_ONBOARDING_FALLBACK = "Store <onboarding@resend.dev>";

/** Server-only: reads `process.env.RESEND_DEFAULT_FROM`. */
export function getResendDefaultFrom(): string {
  return process.env.RESEND_DEFAULT_FROM?.trim() || RESEND_ONBOARDING_FALLBACK;
}
