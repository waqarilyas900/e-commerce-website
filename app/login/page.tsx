import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "./login-form";
import { LoginSignedOutGate } from "./login-signed-out-gate";

function LoginMain() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-md shell-x py-12"
    >
      <h1 className="text-[1.50rem] font-semibold tracking-tight sm:text-3xl">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Use your email and password. New here?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Sign up
        </Link>
        .
      </p>
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <LoginForm />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Suspense
        fallback={
          <main
            id="MainContent"
            className="main-content mx-auto max-w-md shell-x py-12"
          >
            <p className="text-sm text-neutral-500">Loading…</p>
          </main>
        }
      >
        <LoginSignedOutGate>
          <LoginMain />
        </LoginSignedOutGate>
      </Suspense>
    </>
  );
}
