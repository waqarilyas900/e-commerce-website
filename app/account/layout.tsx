import { Suspense } from "react";
import type { Metadata } from "next";
import { buildRoutePageMetadata } from "@/lib/seo";
import { AccountGate } from "@/components/account/account-gate";
import { AccountSuspenseFallback } from "@/components/account/account-suspense-fallback";

export async function generateMetadata(): Promise<Metadata> {
  return buildRoutePageMetadata("/account", {
    title: "My Account",
    forceNoindex: true,
  });
}

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
