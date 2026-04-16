import Link from "next/link";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { dbSearchProducts } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  if (!hasCatalogDb()) {
    notFound();
  }

  const { q = "" } = await searchParams;
  const query = q.trim();

  const results = query.length === 0 ? [] : await dbSearchProducts(q);

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
          <form action="/search" method="get" className="mt-6 flex max-w-xl gap-2">
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search products…"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              autoComplete="off"
              aria-label="Search query"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </form>
        </ScrollReveal>

        {query.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-600">Enter a term to search the catalog.</p>
        ) : results.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-600">
            No products matched &ldquo;{q}&rdquo;.{" "}
            <Link href="/collections" className="font-medium text-neutral-900 underline">
              Browse collections
            </Link>
          </p>
        ) : (
          <ScrollReveal delay={0.05}>
            <p className="mt-6 text-sm text-neutral-600">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {results.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                />
              ))}
            </div>
          </ScrollReveal>
        )}
      </main>
      <Footer />
    </>
  );
}
