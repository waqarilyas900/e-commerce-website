import { Suspense } from "react";
import { AuthCallbackClient } from "@/app/auth/callback/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[40vh] flex-col items-center justify-center shell-x">
          <p className="text-sm text-neutral-600">Loading…</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
