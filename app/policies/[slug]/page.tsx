import { notFound } from "next/navigation";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { getPolicyBySlug } from "@/app/lib/store-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PolicyDetailsPage({ params }: Props) {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);

  if (!policy) {
    notFound();
  }

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">{policy.title}</h1>
        <p className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700">
          {policy.content}
        </p>
      </main>
      <Footer />
    </>
  );
}
