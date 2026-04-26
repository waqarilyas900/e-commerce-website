import { absoluteUrl } from "../canonical";

export type BreadcrumbCrumb = { name: string; url: string };

/**
 * Build a BreadcrumbList graph node. The first item is the trail start (e.g. Home);
 * the last item points at the current page (the canonical URL).
 */
export function breadcrumbJsonLd(items: BreadcrumbCrumb[]): Record<string, unknown> {
  const elements = items
    .map((c) => ({ name: (c.name ?? "").trim(), url: (c.url ?? "").trim() }))
    .filter((c) => c.name && c.url);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.url),
    })),
  };
}
