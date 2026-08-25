"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";
import { AccountShell } from "@/components/account/account-shell";
import { ProfileFormSkeleton } from "@/app/account/profile/profile-form";
import { ProfilePageLayout } from "@/app/account/profile/profile-page-layout";

type Props = { children: React.ReactNode };

type GateStatus = "loading" | "redirect" | "ok" | "misconfigured";

export function AccountGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, user, authReady } = useAuth();
  const [status, setStatus] = useState<GateStatus>("loading");

  useEffect(() => {
    if (!authReady) return;

    try {
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
      setStatus("misconfigured");
    }
  }, [authReady, session, user, pathname, router, searchParams]);

  if (!authReady || status === "loading") {
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
          className="mt-6 inline-flex btn rounded-none bg-neutral-950 text-white"
        >
          Try sign in
        </Link>
      </AccountShell>
    );
  }

  return <AccountShell>{children}</AccountShell>;
}
