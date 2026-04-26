"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
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
    const supabase = createClient();

    function applySession(session: Session | null) {
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
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, whenSignedInHref]);

  if (!ready) {
    return (
      <main
        id="MainContent"
        className="main-content mx-auto max-w-md shell-x py-12"
      >
        <p className="text-sm text-neutral-600" role="status">
          Loading…
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
