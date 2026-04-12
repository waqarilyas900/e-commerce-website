"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { SignedOutOnly } from "@/components/auth/signed-out-only";

export function LoginSignedOutGate({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const whenSignedInHref =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/";

  return (
    <SignedOutOnly whenSignedInHref={whenSignedInHref}>{children}</SignedOutOnly>
  );
}
