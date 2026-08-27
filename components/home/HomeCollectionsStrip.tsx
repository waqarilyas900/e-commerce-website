import Link from "next/link";
import Image from "next/image";
import {
  getCachedListCollections,
  getCachedProductsByCollectionSlug,
} from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { HomeSectionTitle } from "@/components/ui/home-section-title";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";
import {
  collectionDisplayName,
  collectionHref,
  normalizeCollectionSlug,
} from "@/lib/catalog/collection-nav";

export type HomeCollectionTile = {
  slug: string;
  name: string;
  href: string;
  imageUrl: string;
  count: number;
};

/** Supplier CDNs (Daraz etc.) use native img with sized lazcdn URLs. */
function isNativeImg(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (host.endsWith(".supabase.co")) return false;
    if (host === "images.unsplash.com") return false;
    return true;
  } catch {
    return false;
  }
}

export async function loadHomeCollectionTiles(): Promise<HomeCollectionTile[]> {
  if (!hasCatalogDb()) return [];
  const collections = await getCachedListCollections();

  const candidates = collections.filter((col) => {
    const slug = col.slug?.trim();
    const name = col.name?.trim();
    return Boolean(slug && name && slug !== "sale");
  });

  // Parallel: one round-trip wave instead of serial per-collection awaits.
  const tiles = await Promise.all(
    candidates.map(async (col): Promise<HomeCollectionTile | null> => {
      const rawSlug = col.slug.trim();
      const slug = normalizeCollectionSlug(rawSlug);
      const name = collectionDisplayName(slug, col.name.trim());
      const products = await getCachedProductsByCollectionSlug(slug);
      if (products.length === 0) return null;

      const displayName = name;
      const hero = (col.hero_image ?? "").trim();
      const fallback =
        products.find((p) => (p.image ?? "").trim())?.image?.trim() ?? "";
      return {
        slug,
        name: displayName,
        href: collectionHref(slug),
        imageUrl: optimizeSupplierImageUrl(hero || fallback, 400),
        count: products.length,
      };
    }),
  );

  return tiles.filter((t): t is HomeCollectionTile => t != null);
}

/** Shared image-overlay tiles — used on home strip and `/collections` hub. */
export function CollectionImageTiles({ tiles }: { tiles: HomeCollectionTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {tiles.map((tile, i) => {
        const native = isNativeImg(tile.imageUrl);
        return (
          <li
            key={tile.slug}
            className="home-collection-tile"
            style={{ ["--tile-i" as string]: i }}
          >
            <Link
              href={tile.href}
              className="group relative block aspect-[1/1] overflow-hidden rounded-2xl bg-neutral-200 shadow-[0_8px_24px_-12px_rgba(28,29,29,0.35)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_rgba(28,29,29,0.45)] hover:ring-[#E0703A]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0703A]"
            >
              {tile.imageUrl ? (
                native ? (
                  // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs (Daraz) outside next/image allowlist
                  <img
                    src={tile.imageUrl}
                    alt={`${tile.name} collection`}
                    className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.08]"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                  />
                ) : (
                  <Image
                    src={tile.imageUrl}
                    alt={`${tile.name} collection`}
                    fill
                    className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.08]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                  {tile.name}
                </div>
              )}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[48%] bg-gradient-to-t from-black/55 via-black/20 to-transparent"
                aria-hidden
              />

              <span
                className="pointer-events-none absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-base text-[#1c1d1d] opacity-0 shadow-sm backdrop-blur-md transition duration-300 group-hover:opacity-100 group-hover:bg-[#E0703A] group-hover:text-white sm:right-4 sm:top-4"
                aria-hidden
              >
                →
              </span>

              <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-4">
                <span
                  className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80 opacity-0 translate-y-1 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:mb-1.5 sm:text-[10px] sm:tracking-[0.16em]"
                  aria-hidden
                >
                  Shop now
                </span>
                <div className="flex items-end justify-between gap-1.5 sm:gap-2">
                  <span className="text-[13px] font-semibold leading-snug text-white drop-shadow-sm sm:text-[15px]">
                    {tile.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1c1d1d] shadow-sm backdrop-blur-md transition group-hover:bg-[#E0703A] group-hover:text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
                    {tile.count}{" "}
                    <span className="font-medium normal-case tracking-normal opacity-90">
                      {tile.count === 1 ? "item" : "items"}
                    </span>
                  </span>
                </div>
                <span
                  className="mt-2.5 block h-[2px] w-8 origin-left scale-x-0 bg-[#E0703A] transition duration-300 group-hover:scale-x-100"
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact collection grid under the featured band — image-first overlay tiles. */
export function HomeCollectionsStrip({
  tiles,
}: {
  tiles: HomeCollectionTile[];
}) {
  if (tiles.length === 0) return null;

  return (
    <section
      aria-labelledby="home-collections-heading"
      className="relative overflow-hidden border-b border-[#e8e8e1] bg-[linear-gradient(180deg,#f7f5f2_0%,#ffffff_42%,#ffffff_100%)]"
    >
      <div
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[#E0703A]/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#1c1d1d]/[0.04] blur-3xl"
        aria-hidden
      />

      <ScrollReveal className="relative mx-auto max-w-7xl shell-x py-8 sm:py-12">
        <div className="relative mb-6 sm:mb-10">
          <div className="flex flex-col items-center gap-2.5 text-center sm:gap-0">
            <div className="flex w-full items-center justify-between gap-3 sm:justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E0703A] sm:w-auto">
                Browse
              </p>
              <Link
                href="/collections"
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#E0703A] transition hover:text-[#c85f2f] sm:hidden"
              >
                View all
                <span aria-hidden>→</span>
              </Link>
            </div>

            <HomeSectionTitle id="home-collections-heading" center>
              Shop collections
            </HomeSectionTitle>

            <p className="mx-auto max-w-md text-center text-[13px] leading-snug text-neutral-500 sm:mt-2 sm:text-sm sm:leading-relaxed">
              Drinkware, kitchen, beauty &amp; home for everyday&nbsp;Pakistan.
            </p>
          </div>

          <Link
            href="/collections"
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 rounded-full border border-[#1c1d1d]/15 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#1c1d1d] shadow-sm backdrop-blur-sm transition hover:border-[#E0703A] hover:text-[#E0703A] sm:inline-flex"
          >
            View all
            <span aria-hidden>→</span>
          </Link>
        </div>

        <CollectionImageTiles tiles={tiles} />
      </ScrollReveal>
    </section>
  );
}
