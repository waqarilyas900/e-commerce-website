import { SignedOutOnly } from "@/components/auth/signed-out-only";
import type { Metadata } from "next";

import { buildRoutePageMetadata } from "@/lib/seo";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  return buildRoutePageMetadata("/signup", {
    title: "Create Account",
    forceNoindex: true,
  });
}

export default function SignupPage() {
  return (
    <>
      <SignedOutOnly whenSignedInHref="/account">
        <main
          id="MainContent"
          className="main-content mx-auto max-w-md shell-x py-10 sm:py-14"
        >
          <h1 className="text-[1.50rem] font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Create account
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-neutral-600">
            Join the store to save your details, track orders, and check out faster next time.
          </p>
          <div className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8">
            <SignupForm />
          </div>
        </main>
      </SignedOutOnly>
    </>
  );
}
