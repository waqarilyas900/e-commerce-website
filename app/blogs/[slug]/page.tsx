import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogArticleView } from "@/components/blog/blog-article-view";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  getCachedProductDetailBySlug,
  getCachedProductsBySlugs,
} from "@/lib/cache/catalog-data";
import {
  buildProductBlogArticle,
  type BlogArticle,
  type BlogProductInput,
} from "@/app/lib/blog/product-blog";
import {
  getStaticGuideMeta,
  STATIC_BLOG_GUIDES,
} from "@/app/lib/blog/guides";
import {
  buildSeoGuideArticle,
  seoGuideCrumbLabel,
} from "@/app/lib/blog/seo-guides";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import type { Product } from "@/app/lib/catalog/types";

type Props = {
  params: Promise<{ slug: string }>;
};

async function loadBlogProduct(slug: string): Promise<BlogProductInput | null> {
  if (!hasCatalogDb()) return null;
  const [cards, detail] = await Promise.all([
    getCachedProductsBySlugs([slug]),
    getCachedProductDetailBySlug(slug),
  ]);
  const card = cards[0];
  if (!card || !detail || detail.product.status !== "active") return null;
  return {
    ...card,
    imagesRaw: detail.product.images,
  };
}

async function loadGuideImageProducts(slugs: string[]): Promise<Product[]> {
  if (!hasCatalogDb() || !slugs.length) return [];
  const fromSlugs = await getCachedProductsBySlugs(slugs);
  return fromSlugs.filter((p) => p.image);
}

async function resolveArticle(
  slug: string,
  storeName: string,
): Promise<{
  article: BlogArticle;
  crumbLabel: string;
  productLink: { href: string; label: string } | null;
} | null> {
  const guide = getStaticGuideMeta(slug);
  if (guide) {
    const imageProducts = await loadGuideImageProducts(guide.imageProductSlugs);
    const article = buildSeoGuideArticle(guide.slug, storeName, imageProducts);
    if (!article) return null;
    return {
      article,
      crumbLabel: seoGuideCrumbLabel(guide.slug),
      productLink: { href: "/collections", label: "Browse Catalog Collections" },
    };
  }

  const product = await loadBlogProduct(slug);
  if (!product) return null;
  return {
    article: buildProductBlogArticle(product, storeName),
    crumbLabel: product.name,
    productLink: {
      href: `/products/${product.slug}`,
      label: `View ${product.name} Product Page`,
    },
  };
}

export async function generateStaticParams() {
  return STATIC_BLOG_GUIDES.map((g) => ({
    slug: g.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const identity = await loadSiteIdentity();
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const resolved = await resolveArticle(slug, storeName);

  if (!resolved) {
    return buildPageMetadata({
      pathname: `/blogs/${slug}`,
      identity,
      override: null,
      defaults: {
        title: "Buying Guide & Review",
        description: `Buying and lifestyle guides from ${storeName}.`,
        forceNoindex: true,
      },
    });
  }

  const { article } = resolved;
  return buildPageMetadata({
    pathname: `/blogs/${article.slug}`,
    identity,
    override: null,
    defaults: {
      title: article.metaTitle,
      description: article.metaDescription,
      keywords: article.keywords,
      ogType: "article",
    },
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const identity = await loadSiteIdentity();
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const resolved = await resolveArticle(slug, storeName);

  if (!resolved) {
    notFound();
  }

  const { article, crumbLabel, productLink } = resolved;
  const canonical = resolveSeoCanonicalOverride(
    null,
    canonicalUrlFor(`/blogs/${article.slug}`),
  );
  const breadcrumbId = `${canonical}#breadcrumb`;

  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blogs & Guides", url: "/blogs" },
    { name: crumbLabel, url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name: storeName,
      url: canonicalUrlFor("/"),
    },
    publisher: {
      "@type": "Organization",
      name: storeName,
      logo: {
        "@type": "ImageObject",
        url: canonicalUrlFor("/brand/logo.svg"),
      },
    },
    image: article.hero.src.startsWith("http")
      ? article.hero.src
      : canonicalUrlFor(article.hero.src),
  };

  const pageLd = webPageJsonLd({
    url: canonical,
    name: article.metaTitle,
    description: article.metaDescription,
    identity,
    breadcrumbId,
  });

  return (
    <>
      <JsonLd id="ld-blog-page" data={pageLd} />
      <JsonLd id="ld-blog-breadcrumb" data={crumbs} />
      <JsonLd id="ld-blog-article" data={articleLd} />
      <main
        id="MainContent"
        className="main-content bg-white pb-16 pt-4 sm:pb-24 sm:pt-6 md:pt-8"
      >
        <div className="mx-auto max-w-4xl shell-x">
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition hover:text-neutral-900">
              Home
            </Link>
            <span className="text-neutral-300" aria-hidden>
              /
            </span>
            <Link href="/blogs" className="transition hover:text-neutral-900">
              Blogs & Guides
            </Link>
            <span className="text-neutral-300" aria-hidden>
              /
            </span>
            <span className="truncate font-medium text-neutral-900">{crumbLabel}</span>
          </nav>

          <header className="mt-8 border-b border-neutral-100 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                {article.categoryLabel || "Buying Guide"}
              </span>
              <time
                dateTime={article.publishedAt}
                className="text-xs font-semibold text-neutral-500"
              >
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
              {article.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">
              {article.metaDescription}
            </p>
          </header>

          <BlogArticleView article={article} />

          {/* Footer Backlink / CTA */}
          <div className="mt-12 rounded-2xl border border-neutral-200/90 bg-neutral-50 p-6 sm:p-8">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl">
                  Looking to order with Cash on Delivery across Pakistan?
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Explore genuine quality products with fast courier dispatch to your doorstep.
                </p>
              </div>
              <Link
                href={productLink?.href || "/collections"}
                className="shrink-0 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black"
              >
                {productLink?.label || "Browse Collections"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
