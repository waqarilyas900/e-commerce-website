/**
 * Single Google Identity Services (GSI) layer: one `initialize`, One Tap `prompt`,
 * and optional `renderButton` for login/signup (no full-page OAuth when ID token succeeds).
 */
"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  completeGoogleIdTokenSignIn,
  inferSafePostGoogleNavPath,
} from "@/lib/auth/complete-google-id-token-sign-in";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type GoogleIdentityContextValue = {
  gsiReady: boolean;
  identityInitialized: boolean;
  setCredentialNextPath: (path: string | undefined) => void;
};

const GoogleIdentityContext = createContext<GoogleIdentityContextValue | null>(null);

export function useGoogleIdentity() {
  return useContext(GoogleIdentityContext);
}

/**
 * Skip One Tap prompt on auth and password routes to avoid overlap with
 * login/signup forms and modal UI in the same viewport.
 */
const SKIP_PROMPT_PREFIXES = [
  "/auth/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

function shouldSkipPromptRoute(pathname: string): boolean {
  return SKIP_PROMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function parseAllowedOrigins(): string[] | null {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS?.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  /** Env often set to `false` to mean “no allowlist”; otherwise that becomes a bogus origin `"false"`. */
  if (lower === "false" || lower === "0" || lower === "no" || lower === "off") {
    return null;
  }
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

type ProviderProps = { children: React.ReactNode };

export function GoogleIdentityProvider({ children }: ProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const pathname = usePathname() ?? "";
  const skipPromptRoute = useMemo(() => shouldSkipPromptRoute(pathname), [pathname]);
  const router = useRouter();

  const [loadGsiScript, setLoadGsiScript] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [identityInitialized, setIdentityInitialized] = useState(false);

  const initOnce = useRef(false);
  /** Set by `GoogleSignInCredentialButton` so modal/login `next` wins over `inferSafePostGoogleNavPath` */
  const credentialNextPathRef = useRef<string | undefined>(undefined);

  const setCredentialNextPath = useCallback((path: string | undefined) => {
    credentialNextPathRef.current = path;
  }, []);

  useEffect(() => {
    const allowed = parseAllowedOrigins();
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    if (allowed?.length) {
      queueMicrotask(() => setLoadGsiScript(allowed.includes(origin)));
      if (process.env.NODE_ENV === "development" && !allowed.includes(origin)) {
        console.info(
          `[Google One Tap] Skipped: origin ${origin} is not in NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS.`,
        );
      }
      return;
    }

    if (process.env.NODE_ENV !== "development") {
      queueMicrotask(() => setLoadGsiScript(true));
      return;
    }

    const allowAllDev =
      process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS === "true" ||
      process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS === "1";

    if (allowAllDev || isLocalDevHostname(hostname)) {
      queueMicrotask(() => setLoadGsiScript(true));
      return;
    }

    queueMicrotask(() => setLoadGsiScript(false));
    console.info(
      `[Google One Tap] Skipped on ${origin}: add this exact origin to Google Cloud → OAuth client → Authorized JavaScript origins, or use http://localhost:3000, or set NEXT_PUBLIC_GOOGLE_ONE_TAP_DEV_ALL_ORIGINS=true / NEXT_PUBLIC_GOOGLE_ONE_TAP_ALLOWED_ORIGINS=…`,
    );
  }, []);

  useEffect(() => {
    if (!signedIn) initOnce.current = false;
  }, [signedIn]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !clientId) return;
    const suppressGsiDevNoise = (msg: string) =>
      /\[GSI_LOGGER\]: FedCM get\(\) rejects with/i.test(msg) ||
      /\[GSI_LOGGER\]:.*origin is not allowed/i.test(msg) ||
      /\[GSI_LOGGER\]:/i.test(msg);
    /** GoTrue navigator-lock steal / timeout spam in dev (mitigated in `lib/supabase/client` via `processLock`). */
    const suppressGotrueLockDevNoise = (msg: string) =>
      /@supabase\/gotrue-js:/i.test(msg) &&
      (/Lock "/i.test(msg) ||
        /acquisition timed out/i.test(msg) ||
        /orphaned lock/i.test(msg) ||
        /stole it/i.test(msg) ||
        /steal option/i.test(msg) ||
        /Forcefully acquiring the lock/i.test(msg));
    const isAuthLockNoise = (msg: string) =>
      /Lock broken by another request/i.test(msg) ||
      /released because another request stole it/i.test(msg) ||
      (/AbortError/i.test(msg) && /steal|lock/i.test(msg));
    const origError = console.error;
    const origWarn = console.warn;
    const shouldSuppress = (args: unknown[]) => {
      const first = args[0];
      const second = args[1];
      if (typeof first === "string") {
        if (suppressGsiDevNoise(first)) return true;
        if (suppressGotrueLockDevNoise(first)) return true;
        if (
          first.includes("[cart] resolve variants") &&
          ((typeof second === "string" && isAuthLockNoise(second)) ||
            (second instanceof Error && isAuthLockNoise(second.message)))
        ) {
          return true;
        }
      }
      if (typeof second === "string" && suppressGotrueLockDevNoise(second)) return true;
      return false;
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
    if (skipPromptRoute) {
      queueMicrotask(() => {
        setSessionChecked(true);
        setSignedIn(false);
      });
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
  }, [clientId, loadGsiScript, pathname, skipPromptRoute]);

  /** Single GIS initialize + One Tap prompt */
  useEffect(() => {
    if (
      !clientId ||
      !loadGsiScript ||
      !gsiReady ||
      !sessionChecked ||
      signedIn ||
      skipPromptRoute ||
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

    const onCredential = (response: { credential: string }) => {
      const nextPath =
        credentialNextPathRef.current ?? inferSafePostGoogleNavPath();
      credentialNextPathRef.current = undefined;
      void completeGoogleIdTokenSignIn({
        credential: response.credential,
        router,
        nextPath,
      });
    };

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: onCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      queueMicrotask(() => setIdentityInitialized(true));

      google.accounts.id.prompt((notification) => {
        if (process.env.NODE_ENV !== "development") return;
        try {
          if (notification.isNotDisplayed?.()) {
            console.info(
              "[Google One Tap] prompt not displayed:",
              notification.getNotDisplayedReason?.() ?? "(no reason)",
            );
          }
          if (notification.isSkippedMoment?.()) {
            console.info(
              "[Google One Tap] prompt skipped:",
              notification.getSkippedReason?.() ?? "(no reason)",
            );
          }
          if (notification.isDismissedMoment?.()) {
            console.info("[Google One Tap] prompt dismissed (user closed)");
          }
        } catch {
          /* ignore */
        }
      });
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
    skipPromptRoute,
    router,
  ]);

  const ctxValue = useMemo(
    () => ({
      gsiReady: Boolean(clientId && loadGsiScript && gsiReady),
      identityInitialized,
      setCredentialNextPath,
    }),
    [clientId, loadGsiScript, gsiReady, identityInitialized, setCredentialNextPath],
  );

  if (!clientId || !loadGsiScript) {
    return (
      <GoogleIdentityContext.Provider value={null}>
        {children}
      </GoogleIdentityContext.Provider>
    );
  }

  return (
    <GoogleIdentityContext.Provider value={ctxValue}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />
      {children}
    </GoogleIdentityContext.Provider>
  );
}

function safeNextPath(path: string | undefined): string {
  if (path && path.startsWith("/") && !path.startsWith("//") && !path.includes(":")) {
    return path;
  }
  return "/";
}

type CredentialButtonProps = {
  label: string;
  nextHref?: string;
};

/**
 * Google-branded button via GIS `renderButton` — same ID token callback as One Tap (stays on site;
 * no redirect to Google on token errors). Uses `GoogleSignInButton` (OAuth) only when GSI is unavailable.
 */
export function GoogleSignInCredentialButton({ label, nextHref }: CredentialButtonProps) {
  const ctx = useGoogleIdentity();
  const containerRef = useRef<HTMLDivElement>(null);
  const safeNext = safeNextPath(nextHref);
  const isSignup = label.toLowerCase().includes("sign up");

  useEffect(() => {
    if (!ctx?.setCredentialNextPath) return;
    ctx.setCredentialNextPath(safeNext);
    return () => {
      ctx.setCredentialNextPath(undefined);
    };
  }, [ctx, safeNext]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const google = window.google;
    if (!ctx?.identityInitialized || !el || !google?.accounts?.id?.renderButton) {
      return;
    }

    let lastRenderedWidth: number | null = null;

    function renderMeasuredButton() {
      if (!el || !google?.accounts?.id?.renderButton) return;
      const raw = el.getBoundingClientRect().width;
      /** GIS expects px width; cap at 400 (Google default large) and stay inside narrow cards. */
      const widthPx = Math.max(200, Math.min(400, Math.floor(raw || 320)));
      if (lastRenderedWidth === widthPx && el.querySelector("iframe")) {
        return;
      }
      lastRenderedWidth = widthPx;
      el.innerHTML = "";
      try {
        /** `shape` is supported by GIS; not yet in bundled @types — see Google `renderButton` reference. */
        google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: widthPx,
          text: isSignup ? "signup_with" : "signin_with",
          locale: typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en",
          shape: "pill",
        } as Parameters<typeof google.accounts.id.renderButton>[1]);
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Google] renderButton", e);
        }
      }
    }

    renderMeasuredButton();
    const ro = new ResizeObserver(() => {
      renderMeasuredButton();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.innerHTML = "";
    };
  }, [ctx?.identityInitialized, isSignup, label]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return <GoogleSignInButton label={label} nextHref={nextHref} />;
  }

  if (!ctx) {
    return <GoogleSignInButton label={label} nextHref={nextHref} />;
  }

  if (!ctx.identityInitialized) {
    return (
      <div
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-500"
        aria-busy
      >
        Loading Google…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full min-w-0 justify-center [&_iframe]:max-w-full"
    />
  );
}
