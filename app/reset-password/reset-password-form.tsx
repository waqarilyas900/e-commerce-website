"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PASSWORD_RESET_LINK_VALID_MINUTES } from "@/lib/auth/password-reset";

type Phase = "loading" | "invalid" | "ready" | "done";

/**
 * Opaque token in `?t=` — validated server-side; no Supabase browser session required.
 */
const SUCCESS_QUERY = "complete";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() ?? "";
  const isSuccessUrl = searchParams.get(SUCCESS_QUERY) === "1";

  const [phase, setPhase] = useState<Phase>(isSuccessUrl ? "done" : "loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      // After a successful reset we replace the URL with ?complete=1 (no ?t=). Without this,
      // the effect re-runs with an empty token and overwrote "done" with "invalid".
      if (isSuccessUrl) {
        setPhase("done");
        return;
      }
      if (!token || token.length < 32) {
        setPhase("invalid");
        return;
      }
      try {
        const res = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "This link is not valid.");
          setPhase("invalid");
        } else {
          setPhase("ready");
        }
      } catch {
        if (!cancelled) {
          setError("Could not verify the link. Try again.");
          setPhase("invalid");
        }
      }
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, [token, isSuccessUrl]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/complete-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      setPhase("done");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/reset-password?${SUCCESS_QUERY}=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (phase === "loading") {
    return <p className="text-sm text-neutral-600">Verifying your reset link…</p>;
  }

  if (phase === "invalid") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-700" role="alert">
          {error ??
            "No valid reset token. Open the full link from your email (it expires after " +
              PASSWORD_RESET_LINK_VALID_MINUTES +
              " minutes), or request a new one."}
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-neutral-900 underline">
          Request reset link
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          Your password has been reset. Sign in with your new password when you&apos;re ready.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="rp-pass" className="mb-1 block text-sm font-medium">
          New password
        </label>
        <input
          id="rp-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="rp-confirm" className="mb-1 block text-sm font-medium">
          Confirm password
        </label>
        <input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
