"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";
import { GoogleSignInCredentialButton } from "@/components/auth/google-identity-provider";
import { ModalShell } from "@/components/ui/modal-shell";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  title?: string;
  /** Body copy under the title (e.g. wishlist vs reviews). */
  description?: string;
  /** Same-origin path for post-login redirect (Google credential + URL sync). */
  nextPath: string;
  onClose: () => void;
  /**
   * Call `onClose()` after a successful email/password sign-in.
   * Set `false` when the parent relies on `onAuthStateChange` (e.g. PDP reviews + session key)
   * so the session flag is not cleared before that handler runs.
   */
  closeModalOnPasswordSuccess?: boolean;
};

const DEFAULT_DESCRIPTION =
  "Save items to your wishlist and get notified when an option is back in stock.";

export function SignInModal({
  open,
  title = "Sign in to continue",
  description = DEFAULT_DESCRIPTION,
  nextPath,
  onClose,
  closeModalOnPasswordSuccess = true,
}: Props) {
  const router = useRouter();
  const formId = useId();
  const titleId = `${formId}-signin-title`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const signInFormId = `${formId}-signin-form`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  }, [open]);

  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.refresh();
    if (closeModalOnPasswordSuccess) {
      onClose();
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      subtitle={description}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[200]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Not now
          </button>
          <button
            type="submit"
            form={signInFormId}
            disabled={loading}
            className="cursor-pointer rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <GoogleSignInCredentialButton label="Sign in with Google" nextHref={safeNext} />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs capitalize">
            <span className="bg-white px-2 text-neutral-500">or</span>
          </div>
        </div>

        <form id={signInFormId} onSubmit={(e) => void onSubmitEmail(e)} className="space-y-3">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-neutral-800">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none ring-neutral-900/10 transition focus:border-neutral-800 focus:ring-2"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor={passwordId} className="block text-sm font-medium text-neutral-800">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-950"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none ring-neutral-900/10 transition focus:border-neutral-800 focus:ring-2"
            />
          </div>
        </form>

        <p className="text-center text-xs text-neutral-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-neutral-800 underline">
            Create one
          </Link>
        </p>
      </div>
    </ModalShell>
  );
}
