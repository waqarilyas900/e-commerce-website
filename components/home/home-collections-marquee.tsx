"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { HomeCollectionTile } from "@/components/home/HomeCollectionsStrip";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";

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

function TileCard({
  tile,
  duplicate = false,
}: {
  tile: HomeCollectionTile;
  duplicate?: boolean;
}) {
  const src = tile.imageUrl
    ? optimizeSupplierImageUrl(tile.imageUrl, 360) || tile.imageUrl
    : "";
  const native = src ? isNativeImg(src) : false;
  const [loaded, setLoaded] = useState(false);
  const imgClass = `absolute inset-0 h-full w-full object-cover object-center transition-[transform,opacity] duration-500 group-hover:scale-105 ${
    loaded ? "opacity-100" : "opacity-0"
  }`;

  return (
    <Link
      href={tile.href}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate ? true : undefined}
      className="group relative block h-[170px] w-[320px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200 shadow-[0_4px_14px_-8px_rgba(28,29,29,0.45)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:ring-[#E0703A]/45 md:h-[200px] md:w-[372px] lg:h-[220px] lg:w-[400px]"
    >
      {src ? (
        native ? (
          // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs outside next/image allowlist
          <img
            src={src}
            alt={duplicate ? "" : `${tile.name} collection`}
            className={imgClass}
            loading="lazy"
            decoding="async"
            width={400}
            height={200}
            draggable={false}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <Image
            src={src}
            alt={duplicate ? "" : `${tile.name} collection`}
            fill
            className={imgClass}
            sizes="(min-width: 1024px) 400px, (min-width: 768px) 372px, 320px"
            draggable={false}
            onLoad={() => setLoaded(true)}
          />
        )
      ) : (
        <div className="absolute inset-0 bg-neutral-200" />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/70 via-black/25 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 z-10 p-1.5 md:p-3">
        <p className="truncate text-[11px] font-semibold leading-tight text-white drop-shadow-sm md:text-[14px]">
          {tile.name}
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-white/75 md:text-[11px]">
          {tile.count} {tile.count === 1 ? "item" : "items"}
        </p>
      </div>
    </Link>
  );
}

/**
 * Compact infinite-loop category banners — short height, low scroll cost.
 * Pauses on hover / touch; reduced-motion users get a manual horizontal scroller.
 */
export function HomeCollectionsMarquee({ tiles }: { tiles: HomeCollectionTile[] }) {
  /** One visual lap; duplicated in the DOM for a seamless -50% CSS loop. */
  const lap = useMemo(() => {
    if (tiles.length === 0) return [];
    // Short catalogs: repeat so the lap is wide enough on desktop.
    if (tiles.length < 5) return [...tiles, ...tiles, ...tiles];
    if (tiles.length < 8) return [...tiles, ...tiles];
    return tiles;
  }, [tiles]);
  const [paused, setPaused] = useState(false);

  if (tiles.length === 0) return null;

  return (
    <div
      className={`home-collections-marquee-shell relative w-full${paused ? " is-paused" : ""}`}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="home-collections-marquee-mask overflow-hidden py-0.5 motion-reduce:hidden">
        <div className="home-collections-marquee-track flex w-max gap-2.5 md:gap-3.5">
          {lap.map((tile, i) => (
            <TileCard key={`${tile.slug}-a-${i}`} tile={tile} />
          ))}
          {lap.map((tile, i) => (
            <TileCard key={`${tile.slug}-b-${i}`} tile={tile} duplicate />
          ))}
        </div>
      </div>

      <ul className="hidden list-none gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] motion-reduce:flex md:gap-3.5 [&::-webkit-scrollbar]:hidden">
        {tiles.map((tile) => (
          <li key={tile.slug} className="shrink-0">
            <TileCard tile={tile} />
          </li>
        ))}
      </ul>
    </div>
  );
}
