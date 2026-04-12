import { Suspense } from "react";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { LoginForm } from "./login-form";
import { LoginSignedOutGate } from "./login-signed-out-gate";

function LoginMain() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Use your email and password. New here?{" "}
        <a href="/signup" className="font-medium text-neutral-900 underline">
          Sign up
        </a>
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
      <TopStrip />
      <Header />
      <Suspense
        fallback={
          <main
            id="MainContent"
            className="main-content mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8"
          >
            <p className="text-sm text-neutral-500">Loading…</p>
          </main>
        }
      >
        <LoginSignedOutGate>
          <LoginMain />
        </LoginSignedOutGate>
      </Suspense>
      <Footer />
    </>
  );
}
