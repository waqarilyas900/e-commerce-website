"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GoogleSignInCredentialButton } from "@/components/auth/google-identity-provider";

type Props = {
  open: boolean;
  title?: string;
  /** Same-origin path for post-login redirect */
  nextPath: string;
  onClose: () => void;
};

export function SignInModal({
  open,
  title = "Sign in to continue",
  nextPath,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  const loginHref = `/login?next=${encodeURIComponent(safeNext)}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <h2 id="sign-in-modal-title" className="text-lg font-semibold text-neutral-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Save items to your wishlist and get notified when an option is back in stock.
        </p>
        <div className="mt-5 space-y-3">
          <GoogleSignInCredentialButton label="Sign in with Google" nextHref={safeNext} />
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center rounded-full border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
          >
            Sign in with email
          </Link>
          <p className="text-center text-xs text-neutral-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-neutral-800 underline">
              Create one
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
