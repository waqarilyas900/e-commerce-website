import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyHtml } from "@/components/policy/policy-html";

import { dbGetPolicyPage } from "@/app/lib/policy-pages-db";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForSubject,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
  stripHtml,
} from "@/lib/seo";
import {
  JsonLd,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/lib/seo/jsonld";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pathname = `/${slug}`;
  const identity = await loadSiteIdentity();
  const policy = await dbGetPolicyPage(slug);

  if (!policy) {
    return buildPageMetadata({
      pathname,
      identity,
      override: null,
      defaults: {
        title: "Page not found",
        description: identity.siteDescription,
        forceNoindex: true,
      },
    });
  }

  const override = await loadSeoOverrideForSubject(
    "policy_page",
    policy.id,
    identity.locale,
  );

  return buildPageMetadata({
    pathname,
    identity,
    override,
    defaults: {
      title: policy.title,
      description: stripHtml(policy.contentHtml),
      ogType: "article",
      lastModifiedISO: policy.updatedAt ?? undefined,
      publishedISO: policy.updatedAt ?? undefined,
      section: "Policies",
    },
  });
}

export default async function FooterItemPage({ params }: Props) {
  const { slug } = await params;
  const [policy, identity] = await Promise.all([
    dbGetPolicyPage(slug),
    loadSiteIdentity(),
  ]);

  if (!policy) {
    notFound();
  }

  const override = await loadSeoOverrideForSubject(
    "policy_page",
    policy.id,
    identity.locale,
  );
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor(`/${slug}`),
  );
  const crumbsUrlBase = canonicalUrlFor("/");
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Policies", url: "/policies" },
    { name: policy.title, url: canonical },
  ]);
  const articleLd = webPageJsonLd({
    url: canonical,
    name: policy.title,
    description: stripHtml(policy.contentHtml),
    identity,
    asArticle: true,
    articleBodyText: policy.contentHtml,
    dateModifiedISO: policy.updatedAt ?? undefined,
    datePublishedISO: policy.updatedAt ?? undefined,
    breadcrumbId: `${canonical}#breadcrumb`,
  });
  // Tag the breadcrumb node with the same `@id` that the Article references.
  (crumbs as { "@id"?: string })["@id"] = `${canonical}#breadcrumb`;

  return (
    <>
      <JsonLd id="ld-article-policy" data={articleLd} />
      <JsonLd id="ld-breadcrumb-policy" data={crumbs} />
      <main
        id="MainContent"
        className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-7xl shell-x">
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="transition hover:text-neutral-900"
              aria-label={`${identity.storeName || identity.siteTitle || "Home"} — ${crumbsUrlBase}`}
            >
              Home
            </Link>
            <span className="px-0.5 text-neutral-300" aria-hidden>
              /
            </span>
            <Link href="/policies" className="transition hover:text-neutral-900">
              Policies
            </Link>
            <span className="px-0.5 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="font-medium text-neutral-900">{policy.title}</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.50rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              {policy.title}
            </h1>
          </header>

          <div className="py-6 sm:py-8">
            <PolicyHtml html={policy.contentHtml} articleClassName="policy-prose" />
          </div>
        </div>
      </main>
    </>
  );
}
