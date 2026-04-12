/**
 * Mounted from `app/layout.tsx` when `NEXT_PUBLIC_GOOGLE_ONE_TAP` is true. Set
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and add your exact site origin under Google Cloud → OAuth Web client
 * → Authorized JavaScript origins (otherwise `gsi/status` can 403). Fallback: **Sign in with Google**
 * on /login (OAuth redirect).
 *
 * **Nonce:** Supabase requires request `nonce` and JWT `nonce` to **both** be set and match, or **both**
 * absent. Default omits `params.nonce`; if the ID token still includes `nonce`, we redirect to OAuth.
 * Set `NEXT_PUBLIC_GOOGLE_ONE_TAP_STRICT_NONCE=true` to send `params.nonce` and verify SHA-256 before
 * `signInWithIdToken`.
 */
"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Skip One Tap on auth routes (OAuth return / noise). */
const SKIP_PREFIXES = ["/auth/"];

function shouldSkipRoute(pathname: string): boolean {
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Inlined at build time — keep out of `useEffect` deps so Fast Refresh never changes array length. */
const GOOGLE_ONE_TAP_STRICT_NONCE =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_STRICT_NONCE === "true";

function createNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
}

function decodeJwtPayload(jwt: string): { nonce?: string } | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as { nonce?: string };
  } catch {
    return null;
  }
}

/** Supabase / GoTrue compare JWT `nonce` to hex(SHA-256(UTF-8(plaintext))). */
async function sha256HexUtf8(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function signInWithGoogleOAuthRedirect(): Promise<void> {
  const supabase = createClient();
  const origin = window.location.origin;
  const nextPath = `${window.location.pathname}${window.location.search}` || "/";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Google One Tap] OAuth fallback", error.message);
    }
    return;
  }
  if (data.url) {
    window.location.href = data.url;
  }
}

/**
 * Google One Tap — gated in layout by `NEXT_PUBLIC_GOOGLE_ONE_TAP`.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and Google Cloud **Authorized JavaScript origins**
 * (exact `http://localhost:PORT` or production URL) or `gsi/status` returns 403.
 * FedCM for One Tap is **browser-controlled**; `use_fedcm_for_prompt` is deprecated and ignored by GIS.
 * Benign GIS logs (`FedCM get() … NetworkError`, `… AbortError`, etc.) are filtered in dev so they do not trip
 * the Next.js overlay; sign-in still works via OAuth redirect when One Tap fails.
 */
export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  /** Coalesce so dependency arrays stay a fixed shape (React 19 is strict about effect dep list length). */
  const pathname = usePathname() ?? "";
  const skipAuthRoute = useMemo(() => shouldSkipRoute(pathname), [pathname]);
  const router = useRouter();
  const [gsiReady, setGsiReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const initOnce = useRef(false);
  const idTokenNonceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!signedIn) initOnce.current = false;
  }, [signedIn]);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        const supabase = createClient();
        const plain = idTokenNonceRef.current;
        const payload = decodeJwtPayload(response.credential);
        const jwtNonce = payload?.nonce;

        /**
         * GoTrue: request `nonce` and JWT `nonce` claim must both be present and match, or both absent.
         * If Google puts a `nonce` in the token but we don't send the matching plaintext → error.
         * If we can't verify (non-strict / hash mismatch) → OAuth instead of `signInWithIdToken`.
         */
        let nonceForSupabase: string | undefined;

        if (jwtNonce) {
          if (GOOGLE_ONE_TAP_STRICT_NONCE && plain) {
            const expectedHex = await sha256HexUtf8(plain);
            if (expectedHex === jwtNonce) {
              nonceForSupabase = plain;
            } else {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  "[Google One Tap] JWT nonce ≠ SHA-256(client nonce); using OAuth redirect.",
                );
              }
              await signInWithGoogleOAuthRedirect();
              return;
            }
          } else {
            await signInWithGoogleOAuthRedirect();
            return;
          }
        } else {
          nonceForSupabase = undefined;
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          ...(nonceForSupabase ? { nonce: nonceForSupabase } : {}),
        });

        if (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("[Google One Tap]", error.message);
          }
          await signInWithGoogleOAuthRedirect();
          return;
        }
        router.refresh();
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Google One Tap]", e);
        }
      }
    },
    [router],
  );

  /** GIS logs FedCM probe failures to console; in dev that triggers Next’s error overlay even when harmless. */
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !clientId) return;
    /** NetworkError (privacy / token), AbortError (navigation / prompt teardown) — not app bugs. */
    const suppressFedcmProbeNoise =
      /\[GSI_LOGGER\]: FedCM get\(\) rejects with/i;
    const origError = console.error;
    const origWarn = console.warn;
    const shouldSuppress = (args: unknown[]) => {
      const first = args[0];
      return typeof first === "string" && suppressFedcmProbeNoise.test(first);
    };
    console.error = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      origError.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      origWarn.apply(console, args);
    };
    return () => {
      console.error = origError;
      console.warn = origWarn;
    };
  }, [clientId]);

  /** Session probe + subscribe — dependency arity must stay at 3: `[clientId, pathname, skipAuthRoute]`. */
  useEffect(() => {
    if (!clientId) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Google One Tap] Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env and restart the dev server.",
        );
      }
      return;
    }
    /** Avoid racing `/auth/callback` (recovery / OAuth return) — same Supabase browser singleton. */
    if (skipAuthRoute) {
      setSessionChecked(true);
      setSignedIn(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) {
        setSignedIn(!!user);
        setSessionChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [clientId, pathname, skipAuthRoute]);

  useEffect(() => {
    if (
      !clientId ||
      !gsiReady ||
      !sessionChecked ||
      signedIn ||
      skipAuthRoute ||
      initOnce.current
    ) {
      return;
    }
    const google = window.google;
    if (!google?.accounts?.id) return;

    try {
      google.accounts.id.cancel();
    } catch {
      /* ignore */
    }

    initOnce.current = true;

    if (GOOGLE_ONE_TAP_STRICT_NONCE) {
      const nonce = createNonce();
      idTokenNonceRef.current = nonce;
    } else {
      idTokenNonceRef.current = null;
    }

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        ...(GOOGLE_ONE_TAP_STRICT_NONCE && idTokenNonceRef.current
          ? { params: { nonce: idTokenNonceRef.current } }
          : {}),
      });
      google.accounts.id.prompt();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Google One Tap] initialize", e);
      }
    }
  }, [clientId, gsiReady, sessionChecked, signedIn, skipAuthRoute, handleCredential]);

  if (!clientId) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => setGsiReady(true)}
    />
  );
}
