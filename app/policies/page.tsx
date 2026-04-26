import Link from "next/link";
import type { Metadata } from "next";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { dbListPolicySummaries } from "@/app/lib/policy-pages-db";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";

function metaDescriptionFromPolicies(
  siteDescription: string,
  titles: string[],
): string {
  const base = siteDescription.trim();
  if (base) return base.length > 320 ? `${base.slice(0, 317)}…` : base;
  if (titles.length === 0) return "Policy and legal information.";
  const joined = titles.join(" · ");
  return joined.length > 320 ? `${joined.slice(0, 317)}…` : joined;
}

export async function generateMetadata(): Promise<Metadata> {
  const [policyPages, brand] = await Promise.all([
    dbListPolicySummaries(),
    loadStoreBrandFromDatabase(),
  ]);
  const site = brand.siteTitle.trim() || brand.storeName.trim() || "Store";
  const titles = policyPages.map((p) => p.title.trim()).filter(Boolean);
  const description = metaDescriptionFromPolicies(brand.siteDescription, titles);
  return {
    title: `Policies | ${site}`,
    description,
    openGraph: { title: `Policies | ${site}`, description },
  };
}

export default async function PoliciesPage() {
  const [policyPages, brand] = await Promise.all([
    dbListPolicySummaries(),
    loadStoreBrandFromDatabase(),
  ]);

  const storeLabel = brand.storeName.trim() || brand.siteTitle.trim() || "";
  const pageHeading = storeLabel ? `Policies — ${storeLabel}` : "Policies";
  const intro =
    brand.siteDescription.trim() ||
    (policyPages.length > 0
      ? titlesToIntro(policyPages.map((p) => p.title))
      : "");

  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content bg-gradient-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-5xl shell-x">
          <nav className="text-sm text-neutral-500">
            <Link href="/" className="transition hover:text-neutral-900">
              Home
            </Link>
            <span className="px-1 text-neutral-300">/</span>
            <span className="font-medium text-neutral-900">Policies</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
              {pageHeading}
            </h1>
            {intro ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600">{intro}</p>
            ) : null}
          </header>

          {policyPages.length === 0 ? (
            <p className="mt-10 text-sm text-neutral-600">No policy pages are published yet.</p>
          ) : (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {policyPages.map((policy) => (
                <li key={policy.slug}>
                  <Link
                    href={`/${policy.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
                  >
                    <span className="text-lg font-semibold text-neutral-900 group-hover:underline">
                      {policy.title}
                    </span>
                    <span className="mt-2 font-mono text-xs text-neutral-400">/{policy.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function titlesToIntro(titles: string[]): string {
  const t = titles.map((x) => x.trim()).filter(Boolean);
  if (t.length === 0) return "";
  if (t.length <= 4) return t.join(" · ");
  return `${t.slice(0, 4).join(" · ")} · +${t.length - 4} more`;
}
