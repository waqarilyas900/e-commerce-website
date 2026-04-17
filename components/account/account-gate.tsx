"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";
import { AccountShell } from "@/components/account/account-shell";
import { ProfileFormSkeleton } from "@/app/account/profile/profile-form";
import { ProfilePageLayout } from "@/app/account/profile/profile-page-layout";

type Props = { children: React.ReactNode };

type GateStatus = "loading" | "redirect" | "ok" | "misconfigured";

export function AccountGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GateStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = session?.user ?? null;
        if (!user) {
          const next = encodeURIComponent(
            pathname + (searchParams.toString() ? `?${searchParams}` : ""),
          );
          router.replace(`/login?next=${next}`);
          setStatus("redirect");
          return;
        }
        if (isCompletingPasswordReset(session)) {
          router.replace("/reset-password");
          setStatus("redirect");
          return;
        }
        setStatus("ok");
      } catch {
        if (cancelled) return;
        setStatus("misconfigured");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  if (status === "loading") {
    if (pathname === "/account/profile") {
      return (
        <AccountShell>
          <ProfilePageLayout>
            <ProfileFormSkeleton />
          </ProfilePageLayout>
        </AccountShell>
      );
    }
    return (
      <AccountShell>
        <p className="text-sm text-neutral-600">Loading your account…</p>
      </AccountShell>
    );
  }

  if (status === "redirect") {
    return (
      <AccountShell>
        <p className="text-sm text-neutral-600">Redirecting to sign in…</p>
      </AccountShell>
    );
  }

  if (status === "misconfigured") {
    return (
      <AccountShell>
        <h1 className="text-2xl font-semibold tracking-tight">Account unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign-in is not configured for this deployment (missing Supabase URL or anon key).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try sign in
        </Link>
      </AccountShell>
    );
  }

  return <AccountShell>{children}</AccountShell>;
}
