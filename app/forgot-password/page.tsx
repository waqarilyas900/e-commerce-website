import { Suspense } from "react";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-md shell-x py-12"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter your email and we will send a link to choose a new password.
        </p>
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
          <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
