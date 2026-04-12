import Link from "next/link";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { policyPages } from "@/app/lib/store-data";

export default function PoliciesPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Store Policies</h1>
        <p className="mt-2 text-neutral-600">
          Centralized policy hub for shipping, returns, privacy, and terms.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {policyPages.map((policy) => (
            <Link
              key={policy.slug}
              href={`/policies/${policy.slug}`}
              className="rounded-xl border border-neutral-200 bg-white p-5"
            >
              <p className="font-semibold">{policy.title}</p>
              <p className="mt-2 text-sm text-neutral-600">{policy.content}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
