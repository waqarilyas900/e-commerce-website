import { processLock } from "@supabase/auth-js";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One browser client for the whole app. We manage this ourselves (not only `@supabase/ssr`'s
 * internal cache) so Fast Refresh / HMR cannot leave a stale GoTrue client that still uses
 * `navigator.locks` after we switch to `processLock`.
 */
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  if (browserClient) return browserClient;

  /**
   * `isSingleton: false` — do not use the package-level `cachedBrowserClient`, which survives
   * across hot reloads and can keep an old auth lock implementation.
   */
  browserClient = createBrowserClient(url, key, {
    isSingleton: false,
    auth: {
      /**
       * Must be false: default PKCE + implicit recovery URLs (`#access_token`) causes GoTrue to
       * throw on init before `/auth/callback` runs. Session-from-URL is handled only on that page.
       */
      detectSessionInUrl: false,
      /**
       * Default `navigator.locks` uses "steal" recovery, which surfaces as
       * `AbortError: Lock broken by another request with the 'steal' option` when React Strict
       * Mode or parallel effects (e.g. cart resolve + One Tap `getUser`) contend. In-process lock
       * serializes auth in this tab only (no cross-tab mutex; rare multi-tab edge cases only).
       */
      lock: processLock,
    },
  });

  return browserClient;
}
