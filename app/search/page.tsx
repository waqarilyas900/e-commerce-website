import type { Metadata } from "next";

import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SearchPageInteractive } from "@/components/search/search-page-interactive";
import { dbSearchProducts } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";
import {
  buildPageMetadata,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
} from "@/lib/seo";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/search", identity.locale);
  const title = query ? `Search: ${query}` : "Search";
  return buildPageMetadata({
    pathname: "/search",
    searchParams: { q: query || undefined },
    identity,
    override,
    defaults: {
      title,
      description:
        identity.siteDescription ||
        `Search tumblers, bottles, kitchen tools, beauty gadgets and home essentials at ${identity.storeName || identity.siteTitle || "our shop"}.`,
      forceNoindex: true,
    },
  });
}

export default async function SearchPage({ searchParams }: Props) {
  if (!hasCatalogDb()) {
    notFound();
  }

  const { q = "" } = await searchParams;
  const query = q.trim();
  const initialProducts = query.length === 0 ? [] : await dbSearchProducts(query);

  return (
    <>
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <ScrollReveal>
          <h1 className="text-[1.50rem] font-semibold tracking-tight sm:text-3xl">Search</h1>
        </ScrollReveal>

        <SearchPageInteractive
          key={query || "__empty__"}
          initialQuery={query}
          initialProducts={initialProducts}
        />
      </main>
    </>
  );
}
