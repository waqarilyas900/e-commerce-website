"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
  /** Where to send users who already have a session */
  whenSignedInHref: string;
};

/**
 * Renders children only when there is no Supabase session; otherwise redirects.
 * Use inside `<Suspense>` when the parent needs `useSearchParams` (e.g. login `next=`).
 */
export function SignedOutOnly({ children, whenSignedInHref }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = session?.user ?? null;
      if (user && isCompletingPasswordReset(session)) {
        router.replace("/reset-password");
        return;
      }
      if (user) {
        router.replace(whenSignedInHref);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, whenSignedInHref]);

  if (!ready) {
    return (
      <main
        id="MainContent"
        className="main-content mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8"
      >
        <p className="text-sm text-neutral-600" role="status">
          Loading…
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
