"use client";

import { usePathname } from "next/navigation";
import { ProfileFormSkeleton } from "@/app/account/profile/profile-form";
import { ProfilePageLayout } from "@/app/account/profile/profile-page-layout";
import { AccountShell } from "@/components/account/account-shell";

/** Suspense fallback for `/account/*` — profile uses the same skeleton as the form, not the generic line. */
export function AccountSuspenseFallback() {
  const pathname = usePathname() ?? "";

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
