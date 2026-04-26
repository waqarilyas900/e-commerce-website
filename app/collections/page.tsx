import type { Metadata } from "next";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { dbListAllActiveProductsForCards } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";
import {
  buildPageMetadata,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/collections", identity.locale);
  return buildPageMetadata({
    pathname: "/collections",
    identity,
    override,
    defaults: {
      title: "All Products",
      description:
        identity.siteDescription ||
        `Browse the full catalog at ${identity.storeName || identity.siteTitle || "our store"}.`,
    },
  });
}

export default async function CollectionsPage() {
  if (!hasCatalogDb()) {
    notFound();
  }

  const allProducts = await dbListAllActiveProductsForCards();

  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      >
        <ScrollReveal>
          <section>
            <h1 className="text-3xl font-semibold tracking-tight">All Products</h1>
            <div className="mt-3 grid grid-cols-2 gap-1 sm:mt-4 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
              {allProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAddToCart={false}
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                  clampTitle
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
