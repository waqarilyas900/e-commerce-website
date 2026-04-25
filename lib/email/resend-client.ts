import { Resend } from "resend";
import { getResendDefaultFrom } from "@/lib/email/resend-defaults";

/**
 * Env (server-only):
 * - `RESEND_API_KEY` — Resend API key
 * - `RESEND_FROM` — preferred “from”; if unset, see `RESEND_DEFAULT_FROM`
 * - `RESEND_DEFAULT_FROM` — fallback “from” when `RESEND_FROM` is unset (default: Resend test sender)
 * - `RESEND_CONTACT_TO` — inbox for `/api/contact` (your real email while testing)
 */

let client: Resend | null | undefined;

/**
 * Server-only Resend client. Requires `RESEND_API_KEY` in the environment.
 * Returns null when not configured so callers can skip sending in dev.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (client === undefined) {
    client = new Resend(key);
  }
  return client;
}

/** From line: `RESEND_FROM`, else `RESEND_DEFAULT_FROM`, else Resend onboarding sender. */
export function getResendFrom(): string | null {
  const v = process.env.RESEND_FROM?.trim();
  return v || getResendDefaultFrom();
}
