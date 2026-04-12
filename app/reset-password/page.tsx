import { Suspense } from "react";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8"
      >
        <h1 className="text-3xl font-semibold tracking-tight">New password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Use the link from your email. It contains a one-time token (no sign-in required). After you
          set a new password, that link stops working.
        </p>
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
          <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
