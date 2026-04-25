import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { dbGetPolicyPage } from "@/app/lib/policy-pages-db";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";

type Props = {
  params: Promise<{ slug: string }>;
};

function excerptFromHtml(html: string, max: number): string {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > max ? `${plain.slice(0, max - 1)}...` : plain;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [policy, brand] = await Promise.all([dbGetPolicyPage(slug), loadStoreBrandFromDatabase()]);
  const site = brand.siteTitle.trim() || brand.storeName.trim() || "Store";
  if (!policy) {
    return { title: site };
  }
  const description = excerptFromHtml(policy.contentHtml, 155) || policy.title;
  const title = `${policy.title} | ${site}`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function FooterItemPage({ params }: Props) {
  const { slug } = await params;
  const policy = await dbGetPolicyPage(slug);

  if (!policy) {
    notFound();
  }

  const safe = DOMPurify.sanitize(policy.contentHtml.trim(), {
    USE_PROFILES: { html: true },
  });

  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content bg-gradient-to-b from-neutral-50 to-white pb-16 pt-6 sm:pb-20 sm:pt-8"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            <span className="font-medium text-neutral-900">{policy.title}</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              {policy.title}
            </h1>
          </header>

          <div className="py-6 sm:py-8">
            {safe ? (
              <article
                className="policy-prose"
                dangerouslySetInnerHTML={{ __html: safe }}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-6 py-12 text-center text-sm text-neutral-600">
                No content has been added for this page yet.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
