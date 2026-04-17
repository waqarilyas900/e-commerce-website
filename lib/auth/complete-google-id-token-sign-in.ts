import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/** Minimal router surface used after sign-in */
export type GoogleSignInRouter = {
  refresh: () => void;
  push: (href: string) => void;
};

/**
 * One Tap / GIS credential → Supabase session.
 *
 * **Do not send `nonce` in the API body** for Google: GoTrue compares `hex(sha256(nonce))` to the
 * JWT `nonce` claim, but Google uses a **base64url** hash, so verification always fails (“Nonces
 * mismatch”) — see https://github.com/supabase/auth/issues/1829
 *
 * **Required project setting:** Supabase Dashboard → Authentication → Providers → Google → enable
 * **Skip nonce check**. Otherwise GoTrue returns “Passed nonce and nonce in id_token should either
 * both exist or not.” when the ID token includes a `nonce` claim.
 *
 * Does not redirect to accounts.google.com on failure.
 */
export async function completeGoogleIdTokenSignIn(options: {
  credential: string;
  router: GoogleSignInRouter;
  nextPath?: string;
}): Promise<void> {
  const { credential, router, nextPath } = options;
  const supabase = createClient();
  const loadingToastId = toast.loading("Signing you in…");

  try {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Google] signInWithIdToken", error.message);
      }
      if (/nonce/i.test(error.message)) {
        toast.error("Google One Tap needs Supabase setting", {
          description:
            "Enable “Skip nonce check” for the Google provider: Dashboard → Authentication → Providers → Google. Required due to GoTrue vs Google nonce encoding (github.com/supabase/auth/issues/1829).",
          duration: 12_000,
        });
      }
      return;
    }

    router.refresh();
    const dest =
      (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : undefined) ?? inferSafePostGoogleNavPath();
    if (dest && typeof window !== "undefined") {
      const target = new URL(dest, window.location.origin);
      const same =
        target.pathname === window.location.pathname && target.search === window.location.search;
      if (!same) {
        router.push(dest);
      }
    }
  } finally {
    toast.dismiss(loadingToastId);
  }
}

/** Last URL segment after trimming trailing slashes — supports `/login`, `/login/`, `/en/login`. */
function authPageKindFromPathname(pathname: string): "login" | "signup" | null {
  const trimmed = pathname.replace(/\/+$/, "");
  const segments = trimmed.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last === "login") return "login";
  if (last === "signup") return "signup";
  return null;
}

/**
 * Post-login navigation for One Tap when no explicit `next` was set from a credential button.
 * Login respects `?next=`; signup goes to `/`.
 */
export function inferSafePostGoogleNavPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const kind = authPageKindFromPathname(window.location.pathname);
  if (kind === "login") {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) return n;
    return "/";
  }
  if (kind === "signup") return "/";
  return undefined;
}
