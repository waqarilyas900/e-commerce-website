"use client";

import { useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import ReactStars from "react-rating-stars-component";
import { AddToCartVariantButton } from "@/components/cart/AddToCartVariantButton";
import { AppSelect } from "@/components/ui/app-select";
import type {
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import { formatPkr } from "@/app/lib/format-currency";

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

type GalleryItem = { kind: "image" | "video"; url: string; alt: string };

function buildGallery(
  assets: DbProductAssetRow[] | undefined,
  fallbackImages: unknown,
): GalleryItem[] {
  if (assets && assets.length > 0) {
    return [...assets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        kind: a.kind,
        url: a.url,
        alt: a.alt_text || "",
      }));
  }
  const img = firstImage(fallbackImages);
  if (img) return [{ kind: "image", url: img, alt: "" }];
  return [];
}

type Props = {
  product: DbProductRow;
  collectionLabel: string;
  variants: DbProductVariantRow[];
  /** When set (e.g. from DB), drives gallery + video; otherwise uses `product.images` */
  assets?: DbProductAssetRow[];
};

export function ProductPdp({ product, collectionLabel, variants, assets }: Props) {
  const keys = useMemo(() => {
    const s = new Set<string>();
    for (const v of variants) {
      for (const k of Object.keys(v.option_values)) {
        s.add(k);
      }
    }
    return [...s].sort();
  }, [variants]);

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    const v0 = variants[0];
    if (v0) {
      for (const k of Object.keys(v0.option_values)) {
        init[k] = v0.option_values[k] ?? "";
      }
    }
    return init;
  });

  const selectedVariant = useMemo(() => {
    return (
      variants.find((v) =>
        keys.every((k) => (v.option_values[k] ?? "") === (selection[k] ?? "")),
      ) ?? variants[0]
    );
  }, [variants, keys, selection]);

  const [quantity, setQuantity] = useState(1);

  const maxQty = selectedVariant
    ? Math.max(
        0,
        (selectedVariant.quantity_on_hand ?? 0) -
          (selectedVariant.quantity_reserved ?? 0),
      )
    : 0;

  function setOption(key: string, value: string) {
    setSelection((prev) => {
      const next = { ...prev, [key]: value };
      const match = variants.find((v) =>
        keys.every((k) => (v.option_values[k] ?? "") === (next[k] ?? "")),
      );
      if (match) return next;
      const relaxed = variants.find((v) => v.option_values[key] === value);
      if (relaxed) {
        return { ...relaxed.option_values };
      }
      return next;
    });
    setQuantity(1);
  }

  const gallery = useMemo(
    () => buildGallery(assets, product.images),
    [assets, product.images],
  );
  const [activeMedia, setActiveMedia] = useState(0);
  const main = gallery[activeMedia] ?? gallery[0];

  const safeDescriptionHtml = useMemo(() => {
    const raw = product.description?.trim();
    if (!raw) return "";
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [product.description]);

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="min-h-[420px] overflow-hidden rounded-2xl bg-neutral-100">
            {main?.kind === "video" ? (
              <video
                src={main.url}
                controls
                playsInline
                className="h-full min-h-[420px] w-full object-contain"
              />
            ) : main ? (
              <div
                className="min-h-[420px] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${main.url})` }}
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-neutral-400">
                No media
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((item, i) => (
                <button
                  key={`${item.url}-${i}`}
                  type="button"
                  onClick={() => setActiveMedia(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeMedia === i ? "border-neutral-950" : "border-transparent"
                  }`}
                >
                  {item.kind === "video" ? (
                    <span className="flex h-full w-full items-center justify-center bg-neutral-200 text-[10px] font-medium text-neutral-700">
                      Video
                    </span>
                  ) : (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.url})` }}
                    />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-neutral-500">{collectionLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          {safeDescriptionHtml ? (
            <div
              className="text-neutral-600 [&_a]:text-neutral-900 [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <ReactStars
              count={5}
              value={Number(product.rating ?? 0)}
              size={22}
              activeColor="#eab308"
              isHalf
              edit={false}
            />
            <span>
              {(product.rating ?? 0).toFixed(1)}/5 ({product.reviews_count ?? 0} reviews)
            </span>
          </div>

          {keys.length > 0 ? (
            <div className="space-y-3">
              {keys.map((key) => {
                const values = [
                  ...new Set(
                    variants.map((v) => v.option_values[key]).filter(Boolean) as string[],
                  ),
                ].sort();
                const variantOptions = values.map((val) => ({
                  value: val,
                  label: val,
                }));
                return (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {key}
                    </label>
                    <AppSelect
                      inputId={`pdp-option-${key.replace(/\s+/g, "-").toLowerCase()}`}
                      className="max-w-xs"
                      classNamePrefix="pdp-select"
                      options={variantOptions}
                      value={
                        variantOptions.find(
                          (o) => o.value === (selection[key] ?? ""),
                        ) ?? null
                      }
                      onChange={(opt) => {
                        if (opt) setOption(key, opt.value);
                      }}
                      isSearchable={values.length > 10}
                      isClearable={false}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {selectedVariant ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                {selectedVariant.compare_at_price != null &&
                selectedVariant.compare_at_price > selectedVariant.price ? (
                  <>
                    <span className="text-lg text-neutral-500 line-through">
                      {formatPkr(Number(selectedVariant.compare_at_price))}
                    </span>
                    <p className="text-2xl font-semibold">
                      {formatPkr(Number(selectedVariant.price))}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-semibold">
                    {formatPkr(Number(selectedVariant.price))}
                  </p>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {maxQty > 0 ? `${maxQty} in stock` : "Out of stock"}
              </p>

              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Quantity
                  </span>
                  <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                    <button
                      type="button"
                      className="px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-40"
                      aria-label="Decrease quantity"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, maxQty)}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) {
                          setQuantity(1);
                          return;
                        }
                        setQuantity(Math.min(maxQty, Math.max(1, v)));
                      }}
                      className="w-12 border-x border-neutral-200 bg-transparent py-2 text-center text-sm tabular-nums outline-none"
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-40"
                      aria-label="Increase quantity"
                      disabled={quantity >= maxQty}
                      onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
                <AddToCartVariantButton
                  variantId={selectedVariant.id}
                  productId={product.id}
                  quantity={quantity}
                  maxQuantity={maxQty}
                  disabled={maxQty < 1}
                  openDrawer
                  itemName={product.name}
                  className="rounded-full px-6 py-3 text-sm disabled:opacity-50"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600">This product has no purchasable variants.</p>
          )}
        </div>
      </section>
    </>
  );
}
