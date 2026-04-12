import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, key, {
    auth: {
      /**
       * Must be false: default PKCE + implicit recovery URLs (`#access_token`) causes GoTrue to
       * throw on init before `/auth/callback` runs. Session-from-URL is handled only on that page.
       */
      detectSessionInUrl: false,
    },
  });
}
