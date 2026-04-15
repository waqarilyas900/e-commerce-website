"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { clientOptionFingerprint } from "@/lib/wishlist-fingerprint";
import type { DbProductVariantRow } from "@/app/lib/db/types";
import { toastWishlistAdded, toastWishlistRemoved } from "@/lib/wishlist-toast";

type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  /** PDP option dimension keys (Size, Color, …) */
  dimensionKeys: string[];
  selection: Record<string, string>;
  /** Resolved SKU or null when no variant exists for this combination */
  matchedVariant: DbProductVariantRow | null;
  variantIds: string[];
  maxQty: number;
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
  variantIds,
  maxQty,
  compact = false,
  layout = "default",
  className = "",
}: Props) {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const nextPath = `/products/${productSlug}`;

  const refreshStatus = useCallback(async () => {
    const ids = [...new Set(variantIds)].filter(Boolean);
    try {
      const fp = await clientOptionFingerprint(dimensionKeys, selection);
      const qs = new URLSearchParams();
      if (ids.length) qs.set("variants", ids.join(","));
      qs.set("productId", productId);
      qs.set("optionFp", fp);
      const res = await fetch(`/api/wishlist?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        variants?: Record<string, { inWishlist: boolean }>;
        optionRequest?: { inWishlist: boolean };
      };
      if (matchedVariant) {
        setInWishlist(Boolean(data.variants?.[matchedVariant.id]?.inWishlist));
      } else {
        setInWishlist(Boolean(data.optionRequest?.inWishlist));
      }
    } catch {
      /* ignore */
    }
  }, [dimensionKeys, selection, matchedVariant, productId, variantIds]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refreshStatus();
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshStatus]);

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

      if (matchedVariant) {
        body.productVariantId = matchedVariant.id;
        body.notifyOnRestock = maxQty < 1 ? true : false;
      } else {
        body.productVariantId = null;
        body.dimensionKeys = dimensionKeys;
        body.requestedOptionValues = buildRequestedOptions();
        body.notifyOnRestock = true;
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
      setInWishlist(next);
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
          className={btnClass}
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
