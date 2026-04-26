import { notFound } from "next/navigation";
import { ProductPdp } from "@/components/product/product-pdp";
import { CustomerReviews } from "@/components/product/customer-reviews";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import {
  dbGetProductDetailBySlug,
  dbListProductReviewsForPdp,
  dbListProductsByCollectionSlug,
} from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  if (!hasCatalogDb()) {
    notFound();
  }

  const detail = await dbGetProductDetailBySlug(slug);
  if (detail && detail.variants.length > 0) {
    const [relatedDb, initialReviews] = await Promise.all([
      dbListProductsByCollectionSlug(detail.collectionSlug),
      dbListProductReviewsForPdp(detail.product.id),
    ]);
    const related = relatedDb
      .filter((item) => item.slug !== slug)
      .slice(0, 4);

    return (
      <>
        <TopStrip />
        <Header />
        <main
          id="MainContent"
          className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
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
          <section className="mt-8 sm:mt-10">
            <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
            <div className="mt-3 grid grid-cols-2 gap-1 sm:mt-4 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
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
            productId={detail.product.id}
            rating={Number(detail.product.rating ?? 0)}
            reviewsCount={Number(detail.product.reviews_count ?? 0)}
            initialReviews={initialReviews}
          />
        </main>
        <Footer />
      </>
    );
  }

  notFound();
}
