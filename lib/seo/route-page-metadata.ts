import type { Metadata } from "next";
import { buildPageMetadata, loadSeoOverrideForRoute, loadSiteIdentity } from "@/lib/seo";

type RoutePageDefaults = {
  title: string;
  description?: string;
  forceNoindex?: boolean;
};

/** Shared `generateMetadata` helper for static storefront routes. */
export async function buildRoutePageMetadata(
  pathname: string,
  defaults: RoutePageDefaults,
): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute(pathname, identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "our store";
  return buildPageMetadata({
    pathname,
    identity,
    override,
    defaults: {
      title: defaults.title,
      description:
        defaults.description ??
        identity.siteDescription ??
        `${defaults.title} — ${storeName}.`,
      forceNoindex: defaults.forceNoindex,
    },
  });
}
