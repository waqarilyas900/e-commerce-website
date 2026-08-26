import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogArticleView } from "@/components/blog/blog-article-view";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  getCachedAllActiveProductsForCards,
  getCachedProductDetailBySlug,
  getCachedProductsBySlugs,
} from "@/lib/cache/catalog-data";
import {
  buildProductBlogArticle,
  type BlogArticle,
  type BlogProductInput,
} from "@/app/lib/blog/product-blog";
import {
  buildStoreStoryGuideArticle,
  buildWelcome10GuideArticle,
  getStaticGuideMeta,
} from "@/app/lib/blog/guides";
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
  if (!hasCatalogDb()) return [];
  const fromSlugs = await getCachedProductsBySlugs(slugs);
  const bySlug = new Map(fromSlugs.map((p) => [p.slug, p]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean) as Product[];
  if (ordered.length >= 3) return ordered.filter((p) => p.image);
  const fill = (await getCachedAllActiveProductsForCards())
    .filter((p) => p.image && !ordered.some((o) => o.slug === p.slug))
    .slice(0, 5 - ordered.length);
  return [...ordered, ...fill].filter((p) => p.image);
}

async function resolveArticle(
  slug: string,
  storeName: string,
): Promise<{ article: BlogArticle; crumbLabel: string; productLink: { href: string; label: string } | null } | null> {
  const guide = getStaticGuideMeta(slug);
  if (guide) {
    const imageProducts = await loadGuideImageProducts(guide.imageProductSlugs);
    let article: BlogArticle | null = null;
    let crumbLabel = guide.title;
    if (slug === "welcome10-voucher-code-rs-100-discount") {
      article = buildWelcome10GuideArticle(storeName, imageProducts);
      crumbLabel = "WELCOME10 voucher";
    } else if (slug === "inside-simplecart-store-real-stock-cod-pakistan") {
      article = buildStoreStoryGuideArticle(storeName);
      crumbLabel = "Inside our store";
    }
    if (!article) return null;
    return {
      article,
      crumbLabel,
      productLink: { href: "/collections", label: "Browse collections & shop" },
    };
  }

  const product = await loadBlogProduct(slug);
  if (!product) return null;
  return {
    article: buildProductBlogArticle(product, storeName),
    crumbLabel: product.name,
    productLink: {
      href: `/products/${product.slug}`,
      label: `View ${product.name} product page`,
    },
  };
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
        title: "Blog guide",
        description: `Buying guide from ${storeName}.`,
        forceNoindex: true,
      },
    });
  }
  const { article } = resolved;
  return buildPageMetadata({
    pathname: `/blogs/${slug}`,
    identity,
    override: null,
    defaults: {
      title: article.metaTitle,
      description: article.metaDescription,
      ogType: "article",
      publishedISO: article.publishedAt,
      lastModifiedISO: article.publishedAt,
      articleTags: article.keywords.slice(0, 8),
      authors: [storeName],
      section: "SimpleCart Blogs",
      images: article.hero.src
        ? [{ url: article.hero.src, alt: article.hero.alt }]
        : undefined,
      keywords: article.keywords,
    },
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  if (!hasCatalogDb()) notFound();

  const identity = await loadSiteIdentity();
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const resolved = await resolveArticle(slug, storeName);
  if (!resolved) notFound();

  const { article, crumbLabel, productLink } = resolved;
  const isGuide = Boolean(getStaticGuideMeta(slug));
  const canonical = resolveSeoCanonicalOverride(null, canonicalUrlFor(`/blogs/${slug}`));
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "SimpleCart Blogs", url: canonicalUrlFor("/blogs") },
    { name: article.title, url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const pageLd = webPageJsonLd({
    url: canonical,
    name: article.metaTitle,
    description: article.metaDescription,
    identity,
    breadcrumbId,
    asArticle: true,
    articleBodyText: article.articleBodyText,
    authors: [storeName],
    datePublishedISO: article.publishedAt,
    dateModifiedISO: article.publishedAt,
    primaryImageUrl: article.hero.src,
  });

  const related = isGuide
    ? (await getCachedAllActiveProductsForCards())
        .filter((p) => p.image)
        .slice(0, 4)
    : (await getCachedAllActiveProductsForCards())
        .filter((p) => {
          // productSlug on product blogs matches the URL slug
          return p.slug !== slug && p.image;
        })
        .slice(0, 4);

  return (
    <>
      <JsonLd id="ld-blog-post" data={pageLd} />
      <JsonLd id="ld-blog-post-breadcrumb" data={crumbs} />
      <main
        id="MainContent"
        className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-3xl shell-x">
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
            <Link href="/blogs" className="transition hover:text-neutral-900">
              SimpleCart Blogs
            </Link>
            <span className="px-0.5 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="line-clamp-1 font-medium text-neutral-900">{crumbLabel}</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <p className="text-sm font-medium text-neutral-500">SimpleCart Blogs</p>
            <h1 className="mt-2 text-[1.50rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              {article.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              {article.metaDescription}
            </p>
            {productLink ? (
              <p className="mt-3 text-sm text-neutral-500">
                <Link
                  href={productLink.href}
                  className="font-semibold text-neutral-900 underline underline-offset-2"
                >
                  {productLink.label}
                </Link>
              </p>
            ) : null}
          </header>

          <BlogArticleView article={article} />

          {related.length > 0 ? (
            <section className="border-t border-neutral-200/90 pt-10">
              <h2 className="text-xl font-semibold text-neutral-900">
                {isGuide ? "Shop these products" : "Related guides"}
              </h2>
              <ul className="mt-4 list-none space-y-2 pl-0">
                {related.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={isGuide ? `/products/${p.slug}` : `/blogs/${p.slug}`}
                      className="text-neutral-800 underline underline-offset-2 hover:text-neutral-950"
                    >
                      {isGuide ? p.name : `${p.name} buying guide`}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
