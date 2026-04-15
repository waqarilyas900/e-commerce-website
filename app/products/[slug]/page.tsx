import { notFound } from "next/navigation";
import { ProductPdp } from "@/components/product/product-pdp";
import { CustomerReviews } from "@/components/product/customer-reviews";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import {
  dbGetProductDetailBySlug,
  dbListProductsByCollectionSlug,
} from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { formatPkr } from "@/app/lib/format-currency";
import { getProductBySlug, products } from "@/app/lib/store-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  if (hasCatalogDb()) {
    const detail = await dbGetProductDetailBySlug(slug);
    if (detail && detail.variants.length > 0) {
      const relatedDb = await dbListProductsByCollectionSlug(detail.collectionSlug);
      const related = relatedDb
        .filter((item) => item.slug !== slug)
        .slice(0, 4);

      return (
        <>
          <TopStrip />
          <Header />
          <main
            id="MainContent"
            className="main-content mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
          >
            <ProductPdp
              key={detail.product.id}
              product={detail.product}
              productSlug={slug}
              optionDefinitions={detail.optionDefinitions}
              collectionLabel={detail.collectionSlug}
              variants={detail.variants}
              assets={detail.assets}
              colorById={detail.colorById}
            />
            <section className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {related.map((item, idx) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    showAddToCart={false}
                    clampTitle
                    revealDelay={Math.min(idx * 0.08, 0.36)}
                  />
                ))}
              </div>
            </section>
            <CustomerReviews
              rating={Number(detail.product.rating ?? 0)}
              reviewsCount={Number(detail.product.reviews_count ?? 0)}
            />
          </main>
          <Footer />
        </>
      );
    }
  }

  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const related = products
    .filter((item) => item.collection === product.collection && item.slug !== product.slug)
    .slice(0, 4);

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-2">
          <div
            className="min-h-[420px] rounded-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(${product.image})` }}
          />
          <div className="space-y-4">
            <p className="text-sm capitalize tracking-wide text-neutral-500">{product.category}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-neutral-600">{product.description}</p>
            <div className="text-sm text-neutral-600">
              Rating {product.rating}/5 ({product.reviews} reviews)
            </div>
            <p className="text-2xl font-semibold">{formatPkr(product.price)}</p>
            <p className="text-sm text-neutral-600">
              {hasCatalogDb()
                ? "This product is not in the database yet. Run npm run seed:catalog after applying migrations."
                : "Configure Supabase and seed the catalog to enable variants and cart."}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((item, idx) => (
              <ProductCard
                key={item.id}
                product={item}
                showAddToCart={false}
                clampTitle
                revealDelay={Math.min(idx * 0.08, 0.36)}
              />
            ))}
          </div>
        </section>
        <CustomerReviews
          rating={Number(product.rating ?? 0)}
          reviewsCount={Number(product.reviews ?? 0)}
        />
      </main>
      <Footer />
    </>
  );
}
