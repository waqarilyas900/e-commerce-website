import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BlogArticleView } from "@/components/blog/blog-article-view";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getCachedProductsBySlugs } from "@/lib/cache/catalog-data";
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

async function loadGuideImageProducts(slugs: string[]): Promise<Product[]> {
  if (!hasCatalogDb() || !slugs.length) return [];
  const fromSlugs = await getCachedProductsBySlugs(slugs);
  return fromSlugs.filter((p) => p.image);
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
  const guide = getStaticGuideMeta(slug);

  if (!guide) {
    return buildPageMetadata({
      pathname: `/blogs/${slug}`,
      identity,
      override: null,
      defaults: {
        title: "Buying Guide",
        description: `Buying and lifestyle guides from ${storeName}.`,
        forceNoindex: true,
      },
    });
  }

  return buildPageMetadata({
    pathname: `/blogs/${guide.slug}`,
    identity,
    override: null,
    defaults: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      keywords: guide.keywords,
      ogType: "article",
    },
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const identity = await loadSiteIdentity();
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const guide = getStaticGuideMeta(slug);

  // If this is a product slug rather than an editorial guide, 301 redirect to the product page
  if (!guide) {
    permanentRedirect(`/products/${slug}`);
  }

  const imageProducts = await loadGuideImageProducts(guide.imageProductSlugs);
  const article = buildSeoGuideArticle(guide.slug, storeName, imageProducts);

  if (!article) {
    notFound();
  }

  const canonical = resolveSeoCanonicalOverride(
    null,
    canonicalUrlFor(`/blogs/${guide.slug}`),
  );
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbLabel = seoGuideCrumbLabel(guide.slug);

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
            <time
              dateTime={article.publishedAt}
              className="text-xs font-bold uppercase tracking-wider text-amber-600 sm:text-sm"
            >
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
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
                  Looking for quality products with COD across Pakistan?
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Explore our complete verified catalog with fast courier dispatch to your doorstep.
                </p>
              </div>
              <Link
                href="/collections"
                className="shrink-0 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black"
              >
                Browse Collections
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
