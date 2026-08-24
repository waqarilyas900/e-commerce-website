"use client";

import { useEffect } from "react";
import Link from "next/link";


export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <main
        id="MainContent"
        className="main-content mx-auto max-w-lg shell-x py-20 text-center"
      >
        <p className="text-sm font-medium text-red-700">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">We hit a snag</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Please try again. If the problem continues, return to the home page.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Home
          </Link>
        </div>
      </main>
    </>
  );
}
