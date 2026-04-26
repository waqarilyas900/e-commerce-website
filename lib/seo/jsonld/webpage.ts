/**
 * `WebPage` and `Article` JSON-LD generators for non-product/non-collection pages.
 *
 * Why both? Google rewards content pages (policies, "About", FAQ, etc) that
 * declare themselves as `Article` with `dateModified`/`datePublished` and a
 * publisher reference — those signals power the freshness ranking factor and
 * E-E-A-T trust evaluation.
 */

import type { SiteIdentity } from "../types";
import { absoluteUrl } from "../canonical";
import { stripHtml } from "../text";
import { getPublicSiteUrl } from "@/lib/site-url";

export type WebPageJsonLdInput = {
  /** Canonical URL of the page. */
  url: string;
  name: string;
  description?: string;
  identity: SiteIdentity;
  /** ISO-8601 last-edit timestamp. Emitted as `dateModified`. */
  dateModifiedISO?: string | null;
  /** ISO-8601 first-publish timestamp. Falls back to `dateModifiedISO`. */
  datePublishedISO?: string | null;
  /** Optional primary image URL (absolute or root-relative). */
  primaryImageUrl?: string | null;
  /** When set, output `@type: Article` (with `headline` + `articleBody`). */
  asArticle?: boolean;
  /** When asArticle = true, the article body (plain text). */
  articleBodyText?: string;
  /** Article author name(s). */
  authors?: string[];
  /** Optional breadcrumb @id (when paired with a separate `BreadcrumbList`). */
  breadcrumbId?: string;
};

function bcp47From(locale: string | null | undefined): string | undefined {
  const t = (locale ?? "").trim();
  if (!t) return undefined;
  return t.replace(/_/g, "-");
}

export function webPageJsonLd(input: WebPageJsonLdInput): Record<string, unknown> {
  const origin = getPublicSiteUrl();
  const inLanguage = bcp47From(input.identity.locale);
  const description = input.description ? stripHtml(input.description) : undefined;
  const primaryImage = input.primaryImageUrl ? absoluteUrl(input.primaryImageUrl) : undefined;
  const datePublished = input.datePublishedISO || input.dateModifiedISO || undefined;
  const dateModified = input.dateModifiedISO || undefined;

  const baseId = `${input.url}#${input.asArticle ? "article" : "webpage"}`;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.asArticle ? "Article" : "WebPage",
    "@id": baseId,
    url: input.url,
    name: input.name,
    headline: input.asArticle ? input.name : undefined,
    description,
    inLanguage,
    isPartOf: { "@id": `${origin}/#website` },
    publisher: { "@id": `${origin}/#organization` },
  };

  if (primaryImage) {
    node.primaryImageOfPage = {
      "@type": "ImageObject",
      url: primaryImage,
    };
    node.image = primaryImage;
  }
  if (datePublished) node.datePublished = datePublished;
  if (dateModified) node.dateModified = dateModified;

  if (input.asArticle) {
    if (input.articleBodyText && input.articleBodyText.trim()) {
      node.articleBody = stripHtml(input.articleBodyText).slice(0, 5000);
    }
    if (input.authors?.length) {
      node.author = input.authors.map((name) => ({ "@type": "Person", name }));
    } else {
      // Default to the publisher org as author so Google has a verifiable entity.
      node.author = { "@id": `${origin}/#organization` };
    }
  }

  if (input.breadcrumbId) {
    node.breadcrumb = { "@id": input.breadcrumbId };
  }

  for (const k of Object.keys(node)) {
    if (node[k] === undefined) delete node[k];
  }

  return node;
}
