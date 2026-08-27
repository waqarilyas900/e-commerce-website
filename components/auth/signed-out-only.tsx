"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";

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
  const { session, user, authReady } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    if (user && isCompletingPasswordReset(session)) {
      router.replace("/reset-password");
      return;
    }
    if (user) {
      router.replace(whenSignedInHref);
      return;
    }
    queueMicrotask(() => setReady(true));
  }, [authReady, session, user, router, whenSignedInHref]);

  if (!authReady || !ready) {
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
