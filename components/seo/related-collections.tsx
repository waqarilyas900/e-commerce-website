import Link from "next/link";

export type RelatedCollectionLink = {
  slug: string;
  name: string;
};

/** Sibling category links for topical internal SEO under collection PLPs. */
export function RelatedCollections({
  items,
  heading = "Related categories",
}: {
  items: RelatedCollectionLink[];
  heading?: string;
}) {
  const list = items.filter((i) => i.slug && i.name);
  if (list.length === 0) return null;

  return (
    <nav
      className="mt-8 border-t border-neutral-200 pt-8 sm:mt-10 sm:pt-10"
      aria-labelledby="related-collections-heading"
    >
      <h2
        id="related-collections-heading"
        className="text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl"
      >
        {heading}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {list.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/collections/${item.slug}`}
              className="inline-block rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-white hover:underline underline-offset-4"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
