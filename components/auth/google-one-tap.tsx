/**
 * Mounted from `app/layout.tsx` when `NEXT_PUBLIC_GOOGLE_ONE_TAP` is true. Set
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and add your exact site origin under Google Cloud → OAuth Web client
 * → Authorized JavaScript origins (otherwise `gsi/status` can 403). In **development**, the GSI script
 * is not loaded on LAN IPs (e.g. `http://192.168.x.x:3000`) unless you set
 * `NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS=true` or `NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS`
 * to include that origin — avoids 403 spam. Fallback: **Sign in with Google** on /login (OAuth redirect).
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

/**
 * Optional comma-separated origins (e.g. `http://localhost:3000,https://app.example.com`).
 * When set, the GSI script loads only on those origins — avoids 403 / “origin not allowed” when
 * the OAuth client is not configured for the current URL (common with LAN IPs like 192.168.x.x).
 */
function parseAllowedOrigins(): string[] | null {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

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
  /** Avoid loading `gsi/client` when Google will reject the origin (403 + console spam). */
  const [loadGsiScript, setLoadGsiScript] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const initOnce = useRef(false);
  const idTokenNonceRef = useRef<string | null>(null);

  useEffect(() => {
    const allowed = parseAllowedOrigins();
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    if (allowed?.length) {
      setLoadGsiScript(allowed.includes(origin));
      if (process.env.NODE_ENV === "development" && !allowed.includes(origin)) {
        console.info(
          `[Google One Tap] Skipped: origin ${origin} is not in NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS.`,
        );
      }
      return;
    }

    if (process.env.NODE_ENV !== "development") {
      setLoadGsiScript(true);
      return;
    }

    const allowAllDev =
      process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS === "true" ||
      process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS === "1";

    if (allowAllDev || isLocalDevHostname(hostname)) {
      setLoadGsiScript(true);
      return;
    }

    setLoadGsiScript(false);
    console.info(
      `[Google One Tap] Skipped on ${origin}: add this exact origin to Google Cloud → OAuth client → Authorized JavaScript origins, or use http://localhost:3000, or set NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS=true / NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS=…`,
    );
  }, []);

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

  /** GIS logs FedCM / misconfiguration to console; in dev that triggers Next’s error overlay even when harmless. */
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !clientId) return;
    /** FedCM probes, wrong JS origin (403 on gsi/status), ITP — not app bugs. */
    const suppressGsiDevNoise = (msg: string) =>
      /\[GSI_LOGGER\]: FedCM get\(\) rejects with/i.test(msg) ||
      /\[GSI_LOGGER\]:.*origin is not allowed/i.test(msg) ||
      /\[GSI_LOGGER\]:/i.test(msg);
    const origError = console.error;
    const origWarn = console.warn;
    const shouldSuppress = (args: unknown[]) => {
      const first = args[0];
      return typeof first === "string" && suppressGsiDevNoise(first);
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

  /** Session probe + subscribe — runs only when we load GSI (same conditions as `<Script>`). */
  useEffect(() => {
    if (!clientId) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Google One Tap] Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env and restart the dev server.",
        );
      }
      return;
    }
    if (!loadGsiScript) {
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
  }, [clientId, loadGsiScript, pathname, skipAuthRoute]);

  useEffect(() => {
    if (
      !clientId ||
      !loadGsiScript ||
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
  }, [
    clientId,
    loadGsiScript,
    gsiReady,
    sessionChecked,
    signedIn,
    skipAuthRoute,
    handleCredential,
  ]);

  if (!clientId || !loadGsiScript) {
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
