import { Resend } from "resend";
import { RESEND_TEST_SENDER } from "@/lib/email/resend-defaults";

/**
 * Env (server-only):
 * - `RESEND_API_KEY` — Resend API key
 * - `RESEND_FROM` — optional; defaults to test sender (no domain)
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

/** From line; uses Resend test sender when `RESEND_FROM` is unset. */
export function getResendFrom(): string | null {
  const v = process.env.RESEND_FROM?.trim();
  return v || RESEND_TEST_SENDER;
}
