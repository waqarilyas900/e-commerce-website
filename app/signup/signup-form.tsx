"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { validateSignupPassword } from "@/app/lib/password-policy";
import { GoogleSignInCredentialButton } from "@/components/auth/google-identity-provider";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = phone.trim();
    if (!fn || !ln) {
      setError("Please enter your first and last name.");
      return;
    }

    const pwError = validateSignupPassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const origin = window.location.origin;

    const meta = {
      first_name: fn,
      last_name: ln,
      phone: ph || "",
    };

    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: meta,
      },
    });

    if (signError) {
      setLoading(false);
      setError(signError.message);
      return;
    }

    if (data.user && data.session) {
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          auth_id: data.user.id,
          first_name: fn,
          last_name: ln,
          phone: ph || "",
        },
        { onConflict: "auth_id" },
      );
      if (upsertError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[signup] profile upsert:", upsertError);
        }
        setLoading(false);
        setError(
          "Your account was created, but we couldn’t save your profile yet. Please try signing in, or contact us if this continues.",
        );
        return;
      }
    }

    setLoading(false);

    if (data.session) {
      router.push("/");
      return;
    }

    setMessage(
      "Check your inbox — we’ve sent a link to confirm your email. After you confirm, you can sign in and start shopping.",
    );
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <GoogleSignInCredentialButton label="Sign up with Google" nextHref="/" />
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs capitalize">
          <span className="bg-white px-2 text-neutral-500">or</span>
        </div>
      </div>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-950"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="signup-first" className="mb-1.5 block text-sm font-medium text-neutral-800">
            First name
          </label>
          <input
            id="signup-first"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-last" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Last name
          </label>
          <input
            id="signup-last"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="signup-phone" className="mb-1.5 block text-sm font-medium text-neutral-800">
          Phone <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          For delivery updates and order questions — we’ll only use it when needed.
        </p>
      </div>

      <div>
        <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          Use at least 8 characters with uppercase, lowercase, a number, and a symbol — so your
          account stays secure.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating your account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
