import { Suspense } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { AccountShell } from "@/components/account/account-shell";

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <AccountShell>
          <p className="text-sm text-neutral-600">Loading your account…</p>
        </AccountShell>
      }
    >
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
