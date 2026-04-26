"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markPasswordRecoveryFlow } from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";
import { parseAuthRedirectParams } from "@/app/auth/callback/parse-auth-redirect";

const AUTH_TIMEOUT_MS = 25_000;
const GET_SESSION_TIMEOUT_MS = 5_000;
/** Hard cap so we never spin forever if promises or router hang */
const HARD_NAV_TIMEOUT_MS = 14_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Full navigation — reliably applies cookies and leaves /auth/callback (SPA replace can stall). */
function navigateSameOrigin(href: string) {
  if (typeof window === "undefined") return;
  if (href.startsWith("/") && !href.startsWith("//")) {
    window.location.assign(href);
    return;
  }
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin === window.location.origin) {
      window.location.assign(u.pathname + u.search + u.hash);
    } else {
      window.location.assign("/");
    }
  } catch {
    window.location.assign("/login?error=auth");
  }
}

/**
 * Handles Supabase redirects without relying on GoTrue `flowType` auto-detection (PKCE vs implicit).
 * Order: implicit tokens in URL → PKCE `code` → existing session.
 */
export function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const isResetFlow =
    typeof nextParam === "string" && nextParam.includes("reset-password");
  const [message, setMessage] = useState(
    isResetFlow ? "Confirming your reset link…" : "Signing you in…",
  );
  const doneRef = useRef(false);

  const codeParam = searchParams.get("code");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const nextRaw = nextParam ?? "/";
    const next =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

    const hardTimer = window.setTimeout(() => {
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      setMessage("Taking too long — try opening the email link again.");
      navigateSameOrigin("/login?error=auth_timeout");
    }, HARD_NAV_TIMEOUT_MS);

    function finish(href: string) {
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      window.clearTimeout(hardTimer);
      if (href.startsWith("/") && href.includes("reset-password")) {
        markPasswordRecoveryFlow();
      }
      navigateSameOrigin(href);
    }

    async function run() {
      try {
        if (typeof window === "undefined") return;

        const href = window.location.href;
        const params = parseAuthRedirectParams(href);
        const access_token = params.access_token;
        const refresh_token = params.refresh_token;
        const code = codeParam ?? params.code ?? null;

        // 1) Implicit grant / recovery — tokens in hash or query
        if (access_token && refresh_token) {
          const { error } = await withTimeout(
            supabase.auth.setSession({ access_token, refresh_token }),
            AUTH_TIMEOUT_MS,
            "setSession",
          );
          if (cancelled) return;
          if (error) {
            console.error("[auth/callback] setSession", error);
            setMessage("Invalid or expired link.");
            finish(`/login?error=auth`);
            return;
          }
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
          if (next.includes("reset-password")) {
            setMessage("Taking you to choose a new password…");
          }
          finish(next);
          return;
        }

        // 2) PKCE — ?code= (OAuth, some server redirects)
        if (code) {
          const { error } = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            AUTH_TIMEOUT_MS,
            "exchangeCodeForSession",
          );
          if (cancelled) return;
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession", error);
            setMessage("Could not verify sign-in. Try again.");
            finish(`/login?error=auth`);
            return;
          }
          finish(next);
          return;
        }

        // 3) Session already persisted (retry / race)
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          GET_SESSION_TIMEOUT_MS,
          "getSession",
        );
        if (cancelled) return;
        if (session) {
          finish(next);
          return;
        }

        setMessage(
          "This link is missing the security token (often the part after # in the URL). Open the link from your email in a normal browser tab, or request a new reset email.",
        );
        finish(`/login?error=auth`);
      } catch (e) {
        if (cancelled) return;
        console.error("[auth/callback]", e);
        setMessage("Sign-in failed. Try the link again.");
        finish(`/login?error=auth`);
      }
    }

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimer);
    };
  }, [nextParam, codeParam]);

  return (
    <main className="flex min-h-[40vh] flex-col items-center justify-center shell-x">
      <p className="text-sm text-neutral-600">{message}</p>
    </main>
  );
}
