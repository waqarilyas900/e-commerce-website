"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { clientOptionFingerprint } from "@/lib/wishlist-fingerprint";
import type { DbProductVariantRow } from "@/app/lib/db/types";
import { toastWishlistAdded, toastWishlistRemoved } from "@/lib/wishlist-toast";

export type PdpWishlistBulkChange = {
  inWishlist: boolean;
  /** When the row is variant-scoped */
  variantId?: string;
  /** When the row is option-snapshot (no SKU) */
  optionFingerprint?: string;
};

type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  /** PDP option dimension keys (Size, Color, …) */
  dimensionKeys: string[];
  selection: Record<string, string>;
  /** Resolved SKU or null when no variant exists for this combination */
  matchedVariant: DbProductVariantRow | null;
  maxQty: number;
  /** Prefetched from GET /api/wishlist?bulk=1 — variant ids saved for this product */
  wishlistVariantIds: ReadonlySet<string>;
  /** Prefetched option-request fingerprints for this product */
  wishlistOptionFingerprints: ReadonlySet<string>;
  /** Current selection fingerprint (parent computes async; no GET per change) */
  currentOptionFingerprint: string;
  /** False until PDP has loaded bulk wishlist (guest = true immediately) */
  wishlistReady: boolean;
  /** Keep PDP Sets in sync after POST without refetch */
  onWishlistBulkChange?: (patch: PdpWishlistBulkChange) => void;
  compact?: boolean;
  layout?: "default" | "inline";
  className?: string;
};

export function PdpWishlistActions({
  productId,
  productSlug,
  productName,
  dimensionKeys,
  selection,
  matchedVariant,
  maxQty,
  wishlistVariantIds,
  wishlistOptionFingerprints,
  currentOptionFingerprint,
  wishlistReady,
  onWishlistBulkChange,
  compact = false,
  layout = "default",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const nextPath = `/products/${productSlug}`;

  const inWishlist = useMemo(() => {
    if (!wishlistReady) return false;
    if (matchedVariant) {
      return wishlistVariantIds.has(matchedVariant.id);
    }
    if (!currentOptionFingerprint) return false;
    return wishlistOptionFingerprints.has(currentOptionFingerprint);
  }, [
    wishlistReady,
    matchedVariant,
    wishlistVariantIds,
    wishlistOptionFingerprints,
    currentOptionFingerprint,
  ]);

  async function requireAuth(): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return true;
    setAuthOpen(true);
    return false;
  }

  function buildRequestedOptions(): Record<string, string> {
    const o: Record<string, string> = {};
    for (const k of dimensionKeys) {
      o[k] = (selection[k] ?? "").trim();
    }
    return o;
  }

  async function toggleWishlist() {
    if (loading) return;
    const ok = await requireAuth();
    if (!ok) return;
    setLoading(true);
    try {
      const next = !inWishlist;
      const body: Record<string, unknown> = {
        productId,
        inWishlist: next,
      };

      let snapshotFp: string | undefined;

      if (matchedVariant) {
        body.productVariantId = matchedVariant.id;
        body.notifyOnRestock = maxQty < 1 ? true : false;
      } else {
        body.productVariantId = null;
        body.dimensionKeys = dimensionKeys;
        body.requestedOptionValues = buildRequestedOptions();
        body.notifyOnRestock = true;
        snapshotFp = await clientOptionFingerprint(dimensionKeys, selection);
      }

      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setAuthOpen(true);
        return;
      }
      if (!res.ok) return;

      const json = (await res.json()) as { optionFingerprint?: string };

      if (matchedVariant) {
        onWishlistBulkChange?.({
          inWishlist: next,
          variantId: matchedVariant.id,
        });
      } else {
        const fp = json.optionFingerprint ?? snapshotFp;
        if (fp) {
          onWishlistBulkChange?.({
            inWishlist: next,
            optionFingerprint: fp,
          });
        }
      }

      if (next) {
        toastWishlistAdded(productName, {
          restockNotify: Boolean(matchedVariant ? maxQty < 1 : true),
        });
      } else {
        toastWishlistRemoved();
      }
    } finally {
      setLoading(false);
    }
  }

  const baseWrap = className.trim();
  const inline = layout === "inline";

  const btnClass = compact
    ? `inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 sm:text-xs ${inline ? "max-w-none" : "max-w-[14rem]"}`
    : `inline-flex shrink-0 items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 ${inline ? "min-w-0" : "w-full min-w-[12rem] sm:w-auto"}`;

  return (
    <>
      <div className={baseWrap}>
        <button
          type="button"
          onClick={() => void toggleWishlist()}
          disabled={loading}
          aria-pressed={inWishlist}
          className={`cursor-pointer ${btnClass}`}
        >
          <span
            className={`text-lg leading-none ${inWishlist ? "text-red-600" : "text-neutral-400"}`}
            aria-hidden
          >
            {inWishlist ? "♥" : "♡"}
          </span>
          {loading ? (
            <span>…</span>
          ) : (
            <span className={compact ? "text-[11px]" : ""}>Wishlist</span>
          )}
        </button>
      </div>
      <SignInModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        nextPath={nextPath}
        title="Sign in to save this option"
      />
    </>
  );
}
