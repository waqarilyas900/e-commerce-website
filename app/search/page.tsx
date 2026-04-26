import { Footer, Header, TopStrip } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SearchPageInteractive } from "@/components/search/search-page-interactive";
import { dbSearchProducts } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: Props) {
  if (!hasCatalogDb()) {
    notFound();
  }

  const { q = "" } = await searchParams;
  const query = q.trim();
  const initialProducts = query.length === 0 ? [] : await dbSearchProducts(query);

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <ScrollReveal>
          <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        </ScrollReveal>

        <SearchPageInteractive
          key={query || "__empty__"}
          initialQuery={query}
          initialProducts={initialProducts}
        />
      </main>
      <Footer />
    </>
  );
}
