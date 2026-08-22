import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { BlogArticleView } from "@/components/blog/blog-article-view";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  getCachedAllActiveProductsForCards,
  getCachedProductDetailBySlug,
  getCachedProductsBySlugs,
} from "@/lib/cache/catalog-data";
import {
  buildProductBlogArticle,
  type BlogProductInput,
} from "@/app/lib/blog/product-blog";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const identity = await loadSiteIdentity();
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const product = await loadBlogProduct(slug);
  if (!product) {
    return buildPageMetadata({
      pathname: `/blogs/${slug}`,
      identity,
      override: null,
      defaults: {
        title: "Blog guide",
        description: `Product buying guide from ${storeName}.`,
        forceNoindex: true,
      },
    });
  }
  const article = buildProductBlogArticle(product, storeName);
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
  const product = await loadBlogProduct(slug);
  if (!product) notFound();

  const article = buildProductBlogArticle(product, storeName);
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

  const related = (await getCachedAllActiveProductsForCards())
    .filter((p) => p.slug !== slug && p.collection === product.collection && p.image)
    .slice(0, 4);

  return (
    <>
      <JsonLd id="ld-blog-post" data={pageLd} />
      <JsonLd id="ld-blog-post-breadcrumb" data={crumbs} />
      <TopStrip />
      <Header />
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
            <span className="font-medium text-neutral-900 line-clamp-1">{product.name}</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <p className="text-sm font-medium text-neutral-500">SimpleCart Blogs</p>
            <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              {article.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              {article.metaDescription}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              <Link
                href={`/products/${article.productSlug}`}
                className="font-semibold text-neutral-900 underline underline-offset-2"
              >
                View {product.name} product page
              </Link>
            </p>
          </header>

          <BlogArticleView article={article} />

          {related.length > 0 ? (
            <section className="border-t border-neutral-200/90 pt-10">
              <h2 className="text-xl font-semibold text-neutral-900">Related guides</h2>
              <ul className="mt-4 list-none space-y-2 pl-0">
                {related.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blogs/${p.slug}`}
                      className="text-neutral-800 underline underline-offset-2 hover:text-neutral-950"
                    >
                      {p.name} buying guide
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
