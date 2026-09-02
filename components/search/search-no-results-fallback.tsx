"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import type { Product } from "@/app/lib/catalog/types";

type Props = {
  query: string;
};

function whatsappUrlFromPhone(rawPhone: string, storeName: string, query: string): string {
  const cleanPhone = rawPhone.replace(/\D+/g, "");
  const intl = cleanPhone.startsWith("92")
    ? cleanPhone
    : cleanPhone.startsWith("0")
      ? `92${cleanPhone.slice(1)}`
      : `92${cleanPhone}`;
  const text = encodeURIComponent(
    `Hi ${storeName}, I searched "${query}" but couldn't find what I need. Can you help?`,
  );
  return `https://wa.me/${intl}?text=${text}`;
}

export function SearchNoResultsFallback({ query }: Props) {
  const { storeName, footer } = useStoreBrand();
  const [popular, setPopular] = useState<Product[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  const whatsappUrl = useMemo(
    () => whatsappUrlFromPhone(footer.phone || "03001234567", storeName, query),
    [footer.phone, storeName, query],
  );

  const telUrl = useMemo(
    () => `tel:${(footer.phone || "").replace(/\s+/g, "")}`,
    [footer.phone],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingPopular(true);
    void fetch("/api/catalog/random-products?limit=8", {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) return [];
        return (await res.json()) as Product[];
      })
      .then((items) => {
        if (!cancelled) setPopular(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setPopular([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPopular(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="mt-6 space-y-8 sm:mt-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 sm:px-5">
        <p className="text-sm font-medium text-amber-950">
          No products matched &ldquo;{query}&rdquo;.
        </p>
        <p className="mt-1 text-sm text-amber-900/90">
          Try a different spelling, browse collections, or message us — we can help you find it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            WhatsApp us
          </a>
          {footer.phone ? (
            <a
              href={telUrl}
              className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Call {footer.phone}
            </a>
          ) : null}
          <Link
            href="/collections"
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Browse collections
          </Link>
        </div>
        {footer.supportEmail ? (
          <p className="mt-3 text-xs text-amber-900/80">
            Or email{" "}
            <a href={`mailto:${footer.supportEmail}`} className="font-medium underline">
              {footer.supportEmail}
            </a>
          </p>
        ) : null}
      </div>

      <section aria-label="Popular products">
        <h2 className="text-base font-semibold text-neutral-900">Popular right now</h2>
        <p className="mt-1 text-sm text-neutral-600">Customers often order these — maybe one fits?</p>
        {loadingPopular ? (
          <div className="mt-4 grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-4 md:gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : popular.length > 0 ? (
          <ScrollReveal delay={0.05}>
            <div className="mt-4 grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-4 md:gap-2">
              {popular.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                  clampTitle
                />
              ))}
            </div>
          </ScrollReveal>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            <Link href="/" className="font-medium text-neutral-900 underline">
              Back to home
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
