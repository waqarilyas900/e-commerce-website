import { AddBundleButton } from "@/components/cart/AddBundleButton";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { mapProductCard, dbGetProductDetailBySlug } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { dbGetHomeBundles } from "@/app/lib/home-bundles-db";
import type { Product } from "@/app/lib/catalog/types";
import { notFound } from "next/navigation";

async function resolveSlug(slug: string): Promise<{
  card: Product | null;
  line: { variantId: string; productId: string } | null;
}> {
  if (!hasCatalogDb()) {
    return { card: null, line: null };
  }
  const d = await dbGetProductDetailBySlug(slug);
  if (d && d.variants.length > 0) {
    return {
      card: mapProductCard(d.product, d.variants, d.collectionSlug),
      line: { variantId: d.variants[0].id, productId: d.product.id },
    };
  }
  return { card: null, line: null };
}

export default async function BundlesPage() {
  if (!hasCatalogDb()) {
    notFound();
  }

  const bundles = await dbGetHomeBundles();

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
            Pre-built product bundles from your catalog (configure in{" "}
            <code className="text-sm">home_page_settings.bundles</code>).
          </p>
        </section>

        {sections.length === 0 ? (
          <p className="text-sm text-neutral-600">No bundles configured yet.</p>
        ) : (
          <div className="grid gap-8">
            {sections.map(({ bundle, cards, lines }) => (
              <section
                key={bundle.slug}
                className="rounded-2xl border border-neutral-200 bg-white p-6"
              >
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold capitalize tracking-wide text-neutral-500">
                      {bundle.discountLabel}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight">{bundle.name}</h2>
                  </div>
                  <AddBundleButton lines={lines} />
                </div>
                <p className="mb-5 text-sm text-neutral-600">{bundle.description}</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
                  {cards.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      revealDelay={Math.min(idx * 0.08, 0.36)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
