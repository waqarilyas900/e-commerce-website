import type { FaqItem } from "@/lib/seo/jsonld/faq";

/**
 * Visible FAQ block — keep questions identical to FAQPage JSON-LD.
 */
export function StoreFaqSection({
  heading = "Frequently asked questions",
  items,
}: {
  heading?: string;
  items: FaqItem[];
}) {
  const list = items.filter((i) => i.question.trim() && i.answer.trim());
  if (list.length === 0) return null;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-8 sm:mt-12 sm:pt-10" aria-labelledby="store-faq-heading">
      <h2 id="store-faq-heading" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
        {heading}
      </h2>
      <dl className="mt-5 space-y-4">
        {list.map((item) => (
          <div key={item.question} className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 sm:px-5 sm:py-4">
            <dt className="text-sm font-semibold text-neutral-900 sm:text-base">{item.question}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
