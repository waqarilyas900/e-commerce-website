import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { collections, products } from "@/app/lib/store-data";
import { dbListCollections, dbListAllActiveProductsForCards } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import Link from "next/link";

export default async function CollectionsPage() {
  const fromDbCols = hasCatalogDb() ? await dbListCollections() : [];
  const listCols =
    fromDbCols.length > 0
      ? fromDbCols.map((c) => ({
          slug: c.slug,
          name: c.name,
          description: c.description,
          heroImage: c.hero_image,
        }))
      : collections;

  const fromDbProducts = hasCatalogDb() ? await dbListAllActiveProductsForCards() : [];
  const allProducts = fromDbProducts.length > 0 ? fromDbProducts : products;

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <ScrollReveal>
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Shop Collections</h1>
          <p className="mt-2 text-neutral-600">
            Browse collections and products from the catalog.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {listCols.map((collection) => (
              <Link
                key={collection.slug}
                href={`/collections/${collection.slug}`}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <p className="font-semibold">{collection.name}</p>
                <p className="mt-1 text-sm text-neutral-600">{collection.description}</p>
              </Link>
            ))}
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal delay={0.06}>
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">All Products</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {allProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                revealDelay={Math.min(idx * 0.08, 0.36)}
              />
            ))}
          </div>
        </section>
        </ScrollReveal>
      </main>
      <Footer />
    </>
  );
}
