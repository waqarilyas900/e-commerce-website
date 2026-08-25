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
function useNativeImg(src: string): boolean {
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

/** Compact collection grid under the featured band — short names, equal tiles. */
export function HomeCollectionsStrip({
  tiles,
}: {
  tiles: HomeCollectionTile[];
}) {
  if (tiles.length === 0) return null;

  return (
    <section
      aria-labelledby="home-collections-heading"
      className="border-b border-[#e8e8e1] bg-white"
    >
      <ScrollReveal className="mx-auto max-w-7xl shell-x py-8 sm:py-10">
        <div className="relative mb-6 flex items-end justify-center">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Browse
            </p>
            <div className="mt-2">
              <HomeSectionTitle id="home-collections-heading">
                Shop collections
              </HomeSectionTitle>
            </div>
          </div>
          <Link
            href="/collections"
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-[#1c1d1d] underline-offset-4 transition hover:text-[#E0703A] hover:underline sm:inline"
          >
            View all
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {tiles.map((tile) => {
            const native = useNativeImg(tile.imageUrl);
            return (
              <li key={tile.slug}>
                <Link
                  href={tile.href}
                  className="group relative block aspect-[5/6] overflow-hidden rounded-2xl bg-[#1c1d1d] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0703A] after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:z-20 after:h-[3px] after:w-0 after:bg-[#E0703A] after:transition-all after:duration-300 group-hover:after:w-full"
                >
                  {tile.imageUrl ? (
                    native ? (
                      // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs (Daraz) outside next/image allowlist
                      <img
                        src={tile.imageUrl}
                        alt={`${tile.name} collection`}
                        className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.06]"
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={480}
                      />
                    ) : (
                      <Image
                        src={tile.imageUrl}
                        alt={`${tile.name} collection`}
                        fill
                        className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.06]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                      {tile.name}
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#1c1d1d]/90 via-[#1c1d1d]/40 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-3 sm:p-4">
                    <span className="text-sm font-semibold leading-snug text-white sm:text-[15px]">
                      {tile.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                      {tile.count}
                    </span>
                  </div>
                  <span
                    className="pointer-events-none absolute right-3 top-3 z-10 text-lg text-white opacity-0 transition duration-300 group-hover:opacity-100 sm:right-4 sm:top-4"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollReveal>
    </section>
  );
}
