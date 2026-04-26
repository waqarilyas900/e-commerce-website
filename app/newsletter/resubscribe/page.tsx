import Link from "next/link";
import type { Metadata } from "next";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";

export const metadata: Metadata = {
  title: "Newsletter subscribe again",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RpcRow = { ok?: boolean; error?: string; resubscribed?: boolean; already_subscribed?: boolean };

export default async function NewsletterResubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const raw = typeof sp.token === "string" ? sp.token.trim() : "";

  let title = "Subscribe again";
  let message = "This link is invalid or incomplete.";
  let ok = false;

  if (UUID_RE.test(raw)) {
    try {
      const supabase = createAnonServerSupabase();
      const { data, error } = await supabase.rpc("newsletter_resubscribe_by_token", {
        p_token: raw,
      });

      if (error) {
        message = "We could not process this request. Please try again later.";
      } else {
        const row = data as RpcRow | null;
        if (row?.ok === true) {
          ok = true;
          if (row.already_subscribed) {
            title = "You are already subscribed";
            message = "You will continue to receive news and offers at this address.";
          } else {
            title = "You are subscribed again";
            message = "Thanks — you will receive news and offers from us at this address.";
          }
        } else {
          message =
            row?.error === "unknown_token"
              ? "This link is not valid."
              : "We could not complete this request.";
        }
      }
    } catch {
      message = "Something went wrong. Please try again later.";
    }
  }

  return (
    <main
      id="MainContent"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center shell-x py-16 text-center"
    >
      <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      <p className={`mt-3 text-sm leading-relaxed ${ok ? "text-neutral-600" : "text-neutral-700"}`}>
        {message}
      </p>
      <p className="mt-8">
        <Link href="/" className="text-sm font-medium text-neutral-900 underline underline-offset-4">
          Continue shopping
        </Link>
      </p>
    </main>
  );
}
