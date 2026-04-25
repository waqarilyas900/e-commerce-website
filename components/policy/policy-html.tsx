"use client";

import dynamic from "next/dynamic";

const PolicyBody = dynamic(() => import("./policy-body"), {
  ssr: false,
  loading: () => (
    <article
      className="policy-prose min-h-[12rem] animate-pulse rounded-2xl bg-neutral-100/70 sm:min-h-[16rem]"
      aria-busy={true}
      aria-label="Loading content"
    />
  ),
});

export type PolicyHtmlProps = {
  html: string;
  articleClassName?: string;
};

/** Client-only sanitization + render; safe for serverless (no JSDOM on the server). */
export function PolicyHtml({ html, articleClassName }: PolicyHtmlProps) {
  return <PolicyBody html={html} articleClassName={articleClassName} />;
}
