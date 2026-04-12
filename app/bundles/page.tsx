import { AddBundleButton } from "@/components/cart/AddBundleButton";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { mapProductCard, dbGetProductDetailBySlug } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { bundles, getProductBySlug } from "@/app/lib/store-data";
import type { Product } from "@/app/lib/catalog/types";

async function resolveSlug(slug: string): Promise<{
  card: Product | null;
  line: { variantId: string; productId: string } | null;
}> {
  if (hasCatalogDb()) {
    const d = await dbGetProductDetailBySlug(slug);
    if (d && d.variants.length > 0) {
      return {
        card: mapProductCard(d.product, d.variants, d.collectionSlug),
        line: { variantId: d.variants[0].id, productId: d.product.id },
      };
    }
  }
  const p = getProductBySlug(slug);
  return { card: p ?? null, line: null };
}

export default async function BundlesPage() {
  const sections = await Promise.all(
    bundles.map(async (bundle) => {
      const resolved = await Promise.all(bundle.productSlugs.map((slug) => resolveSlug(slug)));
      const cards = resolved.map((r) => r.card).filter((p): p is Product => p !== null);
      const lines = resolved.map((r) => r.line).filter((l): l is NonNullable<typeof l> => l !== null);

      return { bundle, cards, lines };
    }),
  );

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Bundle Deals</h1>
          <p className="mt-2 text-neutral-600">
            Increase order value with pre-built product bundles.
          </p>
        </section>

        <div className="grid gap-8">
          {sections.map(({ bundle, cards, lines }) => (
            <section
              key={bundle.slug}
              className="rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {bundle.discountLabel}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">{bundle.name}</h2>
                </div>
                <AddBundleButton lines={lines} />
              </div>
              <p className="mb-5 text-sm text-neutral-600">{bundle.description}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
