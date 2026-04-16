import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { dbGetPolicyPage } from "@/app/lib/policy-pages-db";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PolicyDetailsPage({ params }: Props) {
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
      <main id="MainContent" className="main-content mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">{policy.title}</h1>
        {safe ? (
          <div
            className="policy-prose mt-4 rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700 [&_a]:text-neutral-900 [&_a]:underline [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        ) : (
          <p className="mt-4 text-sm text-neutral-600">No content yet.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
