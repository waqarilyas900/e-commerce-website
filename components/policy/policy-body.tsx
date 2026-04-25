"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

type PolicyBodyProps = {
  html: string;
  /** Classes on the wrapping `<article>` (layout + prose). */
  articleClassName?: string;
};

/**
 * Rich policy HTML from the DB; sanitized before render.
 * Intended for use with `next/dynamic({ ssr: false })` so DOMPurify runs in the
 * browser only — avoids jsdom / isomorphic-dompurify failures on serverless hosts.
 */
export default function PolicyBody({ html, articleClassName }: PolicyBodyProps) {
  const safe = useMemo(() => {
    try {
      return DOMPurify.sanitize(html.trim(), {
        USE_PROFILES: { html: true },
      });
    } catch {
      return "";
    }
  }, [html]);

  if (!safe) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-6 py-12 text-center text-sm text-neutral-600">
        No content has been added for this page yet.
      </p>
    );
  }

  return (
    <article
      className={articleClassName ?? "policy-prose"}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
