import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  STATIC_BLOG_GUIDES,
  staticGuideListingCard,
} from "@/app/lib/blog/guides";
import {
  buildProductBlogArticle,
  type BlogProductInput,
} from "@/app/lib/blog/product-blog";
import { getCachedAllActiveProductsForCards } from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
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
      title: `${storeName} Buying Guides & Product Reviews | Online Shopping Pakistan`,
      description: `Expert buying guides, hands-on product reviews, fabric comparisons, and COD delivery tips for shoppers in Pakistan. Shop smart at ${storeName}.`,
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
  const title = override?.title?.trim() || `${storeName} Buying Guides & Product Reviews`;
  const description =
    override?.description?.trim() ||
    `Expert buying guides, in-depth product reviews, sizing recommendations, and Cash on Delivery insights for shopping online across Pakistan.`;

  const guideCards = [...STATIC_BLOG_GUIDES]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((meta) => staticGuideListingCard(meta, storeName));

  let productCards: Array<{
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string;
    readTimeMinutes?: number;
    categoryLabel?: string;
    image: { src: string; alt: string };
    href: string;
    isGuide: boolean;
  }> = [];

  if (hasCatalogDb()) {
    const products = await getCachedAllActiveProductsForCards();
    productCards = products.map((p) => {
      const article = buildProductBlogArticle(p as BlogProductInput, storeName);
      return {
        slug: p.slug,
        title: article.title,
        excerpt: article.metaDescription,
        publishedAt: article.publishedAt,
        readTimeMinutes: article.readTimeMinutes || 5,
        categoryLabel: article.categoryLabel || "Product Review",
        image: {
          src: article.hero.src,
          alt: article.hero.alt,
        },
        href: `/blogs/${p.slug}`,
        isGuide: false,
      };
    });
  }

  const allCards = [...guideCards, ...productCards];

  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blogs & Buying Guides", url: canonical },
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
        className="main-content bg-linear-to-b from-neutral-50 to-white pb-14 pt-4 sm:pb-20 sm:pt-6 md:pt-8"
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
            <span className="font-medium text-neutral-900">Blogs & Guides</span>
          </nav>

          <header className="mt-8 max-w-3xl border-b border-neutral-200/90 pb-8">
            <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
              Buying Guides & Product Reviews
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">
              Practical buying guides, hands-on reviews for every catalog item, styling tips,
              and Cash on Delivery advice for online shoppers in Pakistan.
            </p>
          </header>

          <div className="mt-10">
            <ul className="grid list-none grid-cols-1 gap-6 pl-0 sm:grid-cols-2 lg:grid-cols-3">
              {allCards.map((card) => (
                <li key={card.slug}>
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs transition hover:border-neutral-300 hover:shadow-md">
                    <Link href={card.href} className="relative block aspect-[16/10] bg-neutral-100">
                      <Image
                        src={card.image.src}
                        alt={card.image.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        unoptimized={
                          card.image.src.includes("slatic.net") ||
                          card.image.src.includes("alicdn.com")
                        }
                      />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            {card.categoryLabel || (card.isGuide ? "Topic Guide" : "Product Review")}
                          </span>
                          <span className="text-xs text-neutral-500">
                            ⏱️ {card.readTimeMinutes || 5} min read
                          </span>
                        </div>
                        <h2 className="mt-3 text-lg font-bold leading-snug text-neutral-900 sm:text-xl">
                          <Link href={card.href} className="hover:text-amber-600 transition">
                            {card.title}
                          </Link>
                        </h2>
                        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-neutral-600">
                          {card.excerpt}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-neutral-100 pt-4 flex items-center justify-between">
                        <time
                          dateTime={card.publishedAt}
                          className="text-xs font-medium text-neutral-400"
                        >
                          {new Date(card.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                        <Link
                          href={card.href}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-amber-600 transition"
                        >
                          Read Article
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
