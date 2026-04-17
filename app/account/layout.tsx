import { Suspense } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { AccountSuspenseFallback } from "@/components/account/account-suspense-fallback";

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AccountSuspenseFallback />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
