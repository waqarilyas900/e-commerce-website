import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { hasCatalogDb } from "@/app/lib/db/env";
import {
  getCachedAllActiveProductsForCards,
  getCachedProductsBySlugs,
} from "@/lib/cache/catalog-data";
import { blogListingCard } from "@/app/lib/blog/product-blog";
import {
  STATIC_BLOG_GUIDES,
  STATIC_GUIDE_LISTING_HERO,
  staticGuideListingCard,
} from "@/app/lib/blog/guides";
import { orderByRatingAndStockPriority } from "@/app/lib/collection-query";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/blogs", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/blogs",
    identity,
    override,
    defaults: {
      title: "SimpleCart Blogs",
      description: `Read SimpleCart Store buying guides for home, kitchen and beauty products in Pakistan — PKR prices, COD tips, and direct links to shop.`,
      ogType: "website",
    },
  });
}

export default async function BlogsIndexPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/blogs", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/blogs"),
  );
  const title = override?.title?.trim() || "SimpleCart Blogs";
  const description =
    override?.description?.trim() ||
    `Buying guides for active ${storeName} products — SEO tips, COD delivery in Pakistan, and links to shop each item.`;

  const products = hasCatalogDb()
    ? orderByRatingAndStockPriority(await getCachedAllActiveProductsForCards())
    : [];

  const guideHeroBySlug = new Map<string, string | null>();
  if (hasCatalogDb()) {
    const firstSlugs = STATIC_BLOG_GUIDES.map((g) => g.imageProductSlugs[0]).filter(
      Boolean,
    ) as string[];
    const unique = [...new Set(firstSlugs)];
    const imgs = unique.length ? await getCachedProductsBySlugs(unique) : [];
    const bySlug = new Map(imgs.map((p) => [p.slug, p.image ?? null]));
    for (const g of STATIC_BLOG_GUIDES) {
      const fromProduct = g.imageProductSlugs[0]
        ? bySlug.get(g.imageProductSlugs[0]) ?? null
        : null;
      guideHeroBySlug.set(
        g.slug,
        STATIC_GUIDE_LISTING_HERO[g.slug] ?? fromProduct ?? products[0]?.image ?? null,
      );
    }
  } else {
    for (const g of STATIC_BLOG_GUIDES) {
      guideHeroBySlug.set(g.slug, STATIC_GUIDE_LISTING_HERO[g.slug] ?? null);
    }
  }

  const guideCards = [...STATIC_BLOG_GUIDES]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((meta) =>
      staticGuideListingCard(meta, storeName, guideHeroBySlug.get(meta.slug)),
    );
  const productCards = products
    .filter((p) => p.slug && p.image)
    .map((p) => ({
      ...blogListingCard(p, storeName),
      productHref: `/products/${p.slug}` as string,
      isGuide: false as const,
    }));
  const cards = [...guideCards, ...productCards];

  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "SimpleCart Blogs", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const pageLd = webPageJsonLd({
    url: canonical,
    name: title,
    description,
    identity,
    breadcrumbId,
  });

  return (
    <>
      <JsonLd id="ld-blogs" data={pageLd} />
      <JsonLd id="ld-blogs-breadcrumb" data={crumbs} />
      <main
        id="MainContent"
        className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-7xl shell-x">
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition hover:text-neutral-900">
              Home
            </Link>
            <span className="px-0.5 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="font-medium text-neutral-900">SimpleCart Blogs</span>
          </nav>

          <header className="mt-8 max-w-3xl border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.50rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              SimpleCart Blogs
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              Editorial guides for COD, drinkware, kitchen, heaters and ordering — plus a
              buying guide for every active product at {storeName}. Research, then shop with
              cash on delivery across Pakistan.
            </p>
          </header>

          {cards.length === 0 ? (
            <p className="py-12 text-neutral-600">Blog guides will appear here soon.</p>
          ) : (
            <ul className="mt-8 grid list-none grid-cols-1 gap-5 pl-0 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <li key={card.slug}>
                  <article className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200/90 bg-white">
                    <Link href={card.href} className="relative block aspect-[4/3] bg-neutral-50">
                      <Image
                        src={card.image.src}
                        alt={card.image.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-top"
                        unoptimized={
                          card.image.src.includes("slatic.net") ||
                          card.image.src.includes("alicdn.com")
                        }
                      />
                    </Link>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <h2 className="text-base font-semibold leading-snug text-neutral-900">
                        <Link href={card.href} className="hover:underline">
                          {card.title}
                        </Link>
                      </h2>
                      <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
                        {card.description}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-3 pt-1 text-sm font-semibold">
                        <Link
                          href={card.href}
                          className="text-neutral-900 underline underline-offset-2"
                        >
                          Read guide
                        </Link>
                        {card.productHref ? (
                          <Link
                            href={card.productHref}
                            className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
                          >
                            {"isGuide" in card && card.isGuide
                              ? "Shop collections"
                              : "View product"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
