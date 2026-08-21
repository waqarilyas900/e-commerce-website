import Link from "next/link";

export type Crumb = {
  name: string;
  href?: string;
};

/**
 * Visible breadcrumb trail (matches BreadcrumbList JSON-LD where used).
 * Always a single row — long product titles truncate instead of wrapping.
 */
export function PageBreadcrumbs({ items }: { items: Crumb[] }) {
  const crumbs = items.filter((c) => c.name.trim());
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 min-w-0 text-sm text-neutral-500 sm:mb-5">
      <ol className="flex flex-nowrap items-center gap-x-1.5 overflow-hidden">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li
              key={`${c.name}-${i}`}
              className={`flex min-w-0 items-center gap-1.5 ${last ? "shrink" : "shrink-0"}`}
            >
              {i > 0 ? (
                <span className="shrink-0 text-neutral-300" aria-hidden>
                  /
                </span>
              ) : null}
              {last || !c.href ? (
                <span
                  className="block truncate font-medium text-neutral-700"
                  aria-current={last ? "page" : undefined}
                >
                  {c.name}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="block max-w-[28vw] truncate underline-offset-2 transition hover:text-neutral-900 hover:underline sm:max-w-none"
                >
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
