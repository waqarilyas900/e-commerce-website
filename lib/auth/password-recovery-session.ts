import type { Session } from "@supabase/supabase-js";

const STORAGE_KEY = "ecom_password_reset_flow";

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Some Supabase versions encode `amr` differently; scan serialized form. */
function amrLooksLikeRecovery(amr: unknown): boolean {
  if (!Array.isArray(amr)) return false;
  for (const entry of amr) {
    if (entry === "recovery") return true;
    if (entry && typeof entry === "object" && "method" in entry) {
      const m = (entry as { method?: string }).method;
      if (m === "recovery") return true;
    }
  }
  return JSON.stringify(amr).toLowerCase().includes("recovery");
}

/**
 * Password-reset links issue a real session; JWT `amr` usually includes recovery (not always
 * after refresh — use {@link markPasswordRecoveryFlow} from `/auth/callback` as a fallback).
 */
export function isPasswordRecoverySession(
  session: Session | null | undefined,
): boolean {
  if (!session?.access_token) return false;
  const payload = decodeJwtPayload(session.access_token);
  if (!payload) return false;
  return amrLooksLikeRecovery(payload.amr);
}

export function markPasswordRecoveryFlow(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

export function clearPasswordRecoveryFlow(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPasswordRecoveryFlowMarker(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Block `/account/*` and treat like recovery for redirects — JWT or post-callback marker only. */
export function isCompletingPasswordReset(
  session: Session | null | undefined,
): boolean {
  if (!session?.user) return false;
  return isPasswordRecoverySession(session) || hasPasswordRecoveryFlowMarker();
}

/**
 * Header: never show full “logged in” chrome during reset — JWT, callback marker, or simply
 * being on `/reset-password` with a session (JWT `amr` may not say “recovery” on all hosts).
 */
export function shouldUsePasswordRecoveryHeader(
  session: Session | null | undefined,
  pathname: string | null,
): boolean {
  if (!session?.user) return false;
  if (isCompletingPasswordReset(session)) return true;
  return pathname === "/reset-password";
}
