import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

export type PolicyHtmlProps = {
  html: string;
  /** Classes on the wrapping `<article>` (layout + prose). */
  articleClassName?: string;
};

/**
 * Server component: sanitizes admin policy HTML on the server (no `jsdom`) so
 * the page is fully rendered on the first response — important for OG/SEO and
 * crawlers that don't execute JavaScript.
 */
export function PolicyHtml({ html, articleClassName }: PolicyHtmlProps) {
  const safe = sanitizeRichHtml(html);

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
