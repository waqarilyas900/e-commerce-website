"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { hasCatalogDb } from "@/app/lib/db/env";
import { normalizeCompareAtPrice } from "@/lib/cart-savings";

const STORAGE_KEY = "storefront-cart-v2";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CartLine = {
  variantId: string;
  productId: string;
  quantity: number;
};

/** Catalog snapshot from PDP/PLP — skips network resolve when adding to cart. */
export type CartLineSeed = {
  unitPrice: number;
  /** Variant compare-at when on sale; omitted when not discounted. */
  compareAtPrice?: number;
  product: {
    id: string;
    slug: string;
    name: string;
    image: string;
    freeDelivery: boolean;
  };
  variantLabel: string;
  sku?: string;
  trackingId?: string;
};

export type ResolvedCartLine = {
  line: CartLine;
  unitPrice: number;
  /** Compare-at unit price when the variant is on sale. */
  compareAtPrice?: number;
  product: {
    id: string;
    slug: string;
    name: string;
    image: string;
    /** Product-level opt-in; that line's total is excluded from shipping basis. */
    freeDelivery: boolean;
  };
  variantLabel: string;
  sku?: string;
  trackingId?: string;
};

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
  /** True while Supabase is resolving `lines` into `resolvedLines` (checkout should wait). */
  isResolvingCart: boolean;
  itemCount: number;
  subtotal: number;
  resolvedLines: ResolvedCartLine[];
  addVariant: (
    variantId: string,
    productId: string,
    quantity?: number,
    seed?: CartLineSeed,
  ) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Resolves after the current resolution pass (e.g. before `router.push("/checkout")`). */
  waitForCartResolution: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

function formatVariantLabel(option_values: Record<string, string>): string {
  const entries = Object.entries(option_values);
  if (!entries.length) return "";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function buildResolvedFromSeed(line: CartLine, seed: CartLineSeed): ResolvedCartLine {
  const sku = seed.sku?.trim() || undefined;
  return {
    line,
    unitPrice: seed.unitPrice,
    compareAtPrice: normalizeCompareAtPrice(seed.unitPrice, seed.compareAtPrice),
    product: seed.product,
    variantLabel: seed.variantLabel,
    sku,
    trackingId: seed.trackingId?.trim() || sku || line.variantId,
  };
}

function mergeResolvedFromCache(
  lines: CartLine[],
  cache: ResolvedCartLine[],
): ResolvedCartLine[] {
  const byVariant = new Map(cache.map((r) => [r.line.variantId, r]));
  const merged: ResolvedCartLine[] = [];
  for (const line of lines) {
    const hit = byVariant.get(line.variantId);
    if (!hit) continue;
    merged.push({
      ...hit,
      line: { ...hit.line, quantity: line.quantity, productId: line.productId },
    });
  }
  return merged;
}

function allLinesResolved(lines: CartLine[], resolved: ResolvedCartLine[]): boolean {
  if (lines.length === 0) return true;
  const byId = new Map(resolved.map((r) => [r.line.variantId, r]));
  return lines.every((l) => byId.has(l.variantId));
}

function readStorage(): { lines: CartLine[]; resolved: ResolvedCartLine[] } {
  if (typeof window === "undefined") return { lines: [], resolved: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return { lines: [], resolved: [] };
    const trimmed = raw.trim();
    if (trimmed === "") return { lines: [], resolved: [] };
    const parsed: unknown = JSON.parse(trimmed);

    const parseLines = (rows: unknown[]): CartLine[] => {
      const lines: CartLine[] = [];
      for (const row of rows) {
        if (
          row &&
          typeof row === "object" &&
          "variantId" in row &&
          "productId" in row &&
          "quantity" in row &&
          typeof (row as CartLine).variantId === "string" &&
          typeof (row as CartLine).productId === "string" &&
          typeof (row as CartLine).quantity === "number"
        ) {
          if (!isUuid((row as CartLine).variantId)) continue;
          const q = Math.floor((row as CartLine).quantity);
          if (q > 0) {
            lines.push({
              variantId: (row as CartLine).variantId,
              productId: (row as CartLine).productId,
              quantity: q,
            });
          }
        }
      }
      return lines;
    };

    const parseResolved = (rows: unknown[]): ResolvedCartLine[] => {
      const resolved: ResolvedCartLine[] = [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const r = row as ResolvedCartLine;
        if (
          !r.line ||
          typeof r.line.variantId !== "string" ||
          !isUuid(r.line.variantId) ||
          typeof r.unitPrice !== "number" ||
          !r.product ||
          typeof r.product.id !== "string" ||
          typeof r.product.slug !== "string" ||
          typeof r.product.name !== "string"
        ) {
          continue;
        }
        resolved.push({
          line: {
            variantId: r.line.variantId,
            productId: r.line.productId,
            quantity: Math.floor(r.line.quantity),
          },
          unitPrice: r.unitPrice,
          compareAtPrice:
            r.compareAtPrice != null && Number.isFinite(r.compareAtPrice)
              ? normalizeCompareAtPrice(r.unitPrice, r.compareAtPrice)
              : undefined,
          product: {
            id: r.product.id,
            slug: r.product.slug,
            name: r.product.name,
            image: typeof r.product.image === "string" ? r.product.image : "",
            freeDelivery: Boolean(r.product.freeDelivery),
          },
          variantLabel: typeof r.variantLabel === "string" ? r.variantLabel : "",
          sku: typeof r.sku === "string" ? r.sku : undefined,
          trackingId: typeof r.trackingId === "string" ? r.trackingId : undefined,
        });
      }
      return resolved;
    };

    if (Array.isArray(parsed)) {
      return { lines: parseLines(parsed), resolved: [] };
    }

    if (parsed && typeof parsed === "object" && "lines" in parsed) {
      const envelope = parsed as { lines?: unknown; resolved?: unknown };
      const lines = Array.isArray(envelope.lines) ? parseLines(envelope.lines) : [];
      const resolved = Array.isArray(envelope.resolved)
        ? parseResolved(envelope.resolved)
        : [];
      return { lines, resolved: mergeResolvedFromCache(lines, resolved) };
    }

    return { lines: [], resolved: [] };
  } catch {
    return { lines: [], resolved: [] };
  }
}

function writeStorage(lines: CartLine[], resolved: ResolvedCartLine[]) {
  if (typeof window === "undefined") return;
  try {
    if (lines.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lines,
        resolved: mergeResolvedFromCache(lines, resolved),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

function flushCartResolutionWaiters(waiters: MutableRefObject<VoidFunction[]>) {
  const pending = waiters.current.splice(0, waiters.current.length);
  for (const fn of pending) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedLines, setResolvedLines] = useState<ResolvedCartLine[]>([]);
  const [isResolvingCart, setIsResolvingCart] = useState(false);
  const resolutionWaiters = useRef<VoidFunction[]>([]);
  const linesRef = useRef(lines);
  const resolvedRef = useRef(resolvedLines);
  linesRef.current = lines;
  resolvedRef.current = resolvedLines;

  const applySeed = useCallback((line: CartLine, seed: CartLineSeed) => {
    const resolved = buildResolvedFromSeed(line, seed);
    setResolvedLines((prev) => {
      const idx = prev.findIndex((r) => r.line.variantId === line.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = resolved;
        return next;
      }
      return [...prev, resolved];
    });
    setIsResolvingCart(false);
    flushCartResolutionWaiters(resolutionWaiters);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const v1 = localStorage.getItem("storefront-cart-v1");
        if (v1) {
          localStorage.removeItem("storefront-cart-v1");
        }
      } catch {
        /* ignore */
      }
      const stored = readStorage();
      const hydrated = mergeResolvedFromCache(stored.lines, stored.resolved);
      if (hydrated.length > 0) {
        setResolvedLines(hydrated);
      }
      if (
        stored.lines.length > 0 &&
        hasCatalogDb() &&
        !allLinesResolved(stored.lines, hydrated)
      ) {
        setIsResolvingCart(true);
      }
      setLines(stored.lines);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStorage(lines, resolvedLines);
  }, [lines, resolvedLines, ready]);

  useEffect(() => {
    if (!ready || !hasCatalogDb() || lines.length === 0) {
      setResolvedLines([]);
      setIsResolvingCart(false);
      flushCartResolutionWaiters(resolutionWaiters);
      return;
    }

    const cached = mergeResolvedFromCache(lines, resolvedRef.current);
    const missingVariantIds = lines
      .map((l) => l.variantId)
      .filter((id) => !cached.some((r) => r.line.variantId === id));

    const needsCompareAtBackfill = cached.some((r) => r.compareAtPrice == null);

    if (
      missingVariantIds.length === 0 &&
      cached.length === lines.length &&
      !needsCompareAtBackfill
    ) {
      setResolvedLines(cached);
      setIsResolvingCart(false);
      flushCartResolutionWaiters(resolutionWaiters);
      return;
    }

    const hasDisplaySnapshot = allLinesResolved(lines, cached);

    let cancelled = false;
    if (!hasDisplaySnapshot) {
      setIsResolvingCart(true);
    }

    void (async () => {
      try {
        const supabase = createClient();
        const idsToFetch = [
          ...new Set(
            needsCompareAtBackfill
              ? lines.map((l) => l.variantId)
              : missingVariantIds,
          ),
        ];

        const { data: variantRows, error: vErr } = await supabase
          .from("product_variants")
          .select("id, price, compare_at_price, option_values, product_id, sku")
          .in("id", idsToFetch);

        if (vErr || cancelled) {
          if (vErr) console.error("[cart] resolve variants", vErr.message);
          if (!cancelled && cached.length > 0) {
            setResolvedLines(cached);
          } else if (!cancelled) {
            setResolvedLines([]);
          }
          return;
        }

        const pidSet = new Set<string>();
        for (const row of variantRows ?? []) {
          const pid = row.product_id as string | null | undefined;
          if (pid) pidSet.add(pid);
        }
        for (const line of lines) {
          if (line.productId) pidSet.add(line.productId);
        }
        const cachedProductIds = new Set(cached.map((r) => r.product.id));
        const productIds = [...pidSet].filter((id) => !cachedProductIds.has(id));

        const { data: productRows, error: pErr } =
          productIds.length > 0
            ? await supabase
                .from("products")
                .select("id, slug, name, images, free_delivery")
                .in("id", productIds)
            : { data: [], error: null };

        if (pErr || cancelled) {
          if (pErr) console.error("[cart] resolve products", pErr.message);
          if (!cancelled && cached.length > 0) {
            setResolvedLines(cached);
          } else if (!cancelled) {
            setResolvedLines([]);
          }
          return;
        }

        const productMap = new Map<
          string,
          { id: string; slug: string; name: string; images: unknown; free_delivery?: boolean | null }
        >();
        for (const r of cached) {
          productMap.set(r.product.id, {
            id: r.product.id,
            slug: r.product.slug,
            name: r.product.name,
            images: r.product.image ? [r.product.image] : [],
            free_delivery: r.product.freeDelivery,
          });
        }
        for (const p of productRows ?? []) {
          productMap.set(p.id as string, p as {
            id: string;
            slug: string;
            name: string;
            images: unknown;
            free_delivery?: boolean | null;
          });
        }

        const variantMeta = new Map<
          string,
          {
            price: number;
            compare_at_price: number | null;
            option_values: Record<string, string>;
            productId: string;
            sku: string;
          }
        >();
        for (const row of variantRows ?? []) {
          variantMeta.set(row.id as string, {
            price: Number(row.price),
            compare_at_price:
              row.compare_at_price != null ? Number(row.compare_at_price) : null,
            option_values: (row.option_values ?? {}) as Record<string, string>,
            productId: row.product_id as string,
            sku: String(row.sku ?? "").trim(),
          });
        }

        const resolved: ResolvedCartLine[] = [];
        for (const line of lines) {
          if (!missingVariantIds.includes(line.variantId)) {
            const hit = cached.find((r) => r.line.variantId === line.variantId);
            if (hit) {
              const vr = variantMeta.get(line.variantId);
              const compareAtPrice =
                hit.compareAtPrice ??
                (vr
                  ? normalizeCompareAtPrice(hit.unitPrice, vr.compare_at_price)
                  : undefined);
              resolved.push({
                ...hit,
                compareAtPrice,
                line: { ...hit.line, quantity: line.quantity, productId: line.productId },
              });
            }
            continue;
          }

          const vr = variantMeta.get(line.variantId);
          if (!vr) continue;
          const pr = productMap.get(vr.productId) ?? productMap.get(line.productId);
          if (!pr) continue;
          const sku = vr.sku || undefined;
          const trackingId = (vr.sku || "").trim() || line.variantId;
          resolved.push({
            line,
            unitPrice: vr.price,
            compareAtPrice: normalizeCompareAtPrice(vr.price, vr.compare_at_price),
            product: {
              id: pr.id,
              slug: pr.slug,
              name: pr.name,
              image: firstImage(pr.images),
              freeDelivery: Boolean(pr.free_delivery),
            },
            variantLabel: formatVariantLabel(vr.option_values),
            sku,
            trackingId,
          });
        }

        if (!cancelled) setResolvedLines(resolved);
      } catch (e) {
        console.error("[cart] resolve", e);
        if (!cancelled) {
          const fallback = mergeResolvedFromCache(lines, resolvedRef.current);
          setResolvedLines(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingCart(false);
          flushCartResolutionWaiters(resolutionWaiters);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lines, ready]);

  useEffect(() => {
    if (resolvedLines.length > 0) {
      flushCartResolutionWaiters(resolutionWaiters);
    }
  }, [resolvedLines]);

  const waitForCartResolution = useCallback(async () => {
    if (!hasCatalogDb()) return;
    if (linesRef.current.length === 0) return;
    if (allLinesResolved(linesRef.current, resolvedRef.current)) return;
    await Promise.race([
      new Promise<void>((resolve) => {
        resolutionWaiters.current.push(resolve);
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
    ]);
  }, []);

  const setLinesSafe = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => updater(prev));
  }, []);

  const addVariant = useCallback(
    (variantId: string, productId: string, quantity = 1, seed?: CartLineSeed) => {
      if (!isUuid(variantId)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[cart] addVariant ignored invalid variant id", variantId);
        }
        return;
      }
      const q = Math.max(1, Math.min(99, Math.floor(quantity)));
      const prev = linesRef.current;
      const i = prev.findIndex((l) => l.variantId === variantId);
      const nextLine: CartLine =
        i >= 0
          ? {
              ...prev[i],
              quantity: Math.min(99, prev[i].quantity + q),
            }
          : { variantId, productId, quantity: q };

      setLinesSafe((p) => {
        const j = p.findIndex((l) => l.variantId === variantId);
        if (j >= 0) {
          const next = [...p];
          next[j] = {
            ...next[j],
            quantity: Math.min(99, next[j].quantity + q),
          };
          return next;
        }
        return [...p, { variantId, productId, quantity: q }];
      });

      if (seed) {
        applySeed(nextLine, seed);
      }
    },
    [applySeed, setLinesSafe],
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const q = Math.floor(quantity);
      if (q < 1) {
        setLinesSafe((prev) => prev.filter((l) => l.variantId !== variantId));
        setResolvedLines((prev) => prev.filter((r) => r.line.variantId !== variantId));
        return;
      }
      setLinesSafe((prev) => {
        const i = prev.findIndex((l) => l.variantId === variantId);
        if (i < 0) return prev;
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(99, q) };
        return next;
      });
      setResolvedLines((prev) =>
        prev.map((r) =>
          r.line.variantId === variantId
            ? { ...r, line: { ...r.line, quantity: Math.min(99, q) } }
            : r,
        ),
      );
    },
    [setLinesSafe],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      setLinesSafe((prev) => prev.filter((l) => l.variantId !== variantId));
      setResolvedLines((prev) => prev.filter((r) => r.line.variantId !== variantId));
    },
    [setLinesSafe],
  );

  const clearCart = useCallback(() => {
    setLines([]);
    setResolvedLines([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const itemCount = useMemo(() => {
    if (resolvedLines.length > 0) {
      return resolvedLines.reduce((n, { line }) => n + line.quantity, 0);
    }
    return lines.reduce((n, l) => n + l.quantity, 0);
  }, [resolvedLines, lines]);

  const subtotal = useMemo(
    () =>
      resolvedLines.reduce((sum, { line, unitPrice }) => sum + unitPrice * line.quantity, 0),
    [resolvedLines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      lines,
      isResolvingCart,
      itemCount,
      subtotal,
      resolvedLines,
      addVariant,
      updateQuantity,
      removeItem,
      clearCart,
      isOpen,
      openCart,
      closeCart,
      waitForCartResolution,
    }),
    [
      ready,
      lines,
      isResolvingCart,
      itemCount,
      subtotal,
      resolvedLines,
      addVariant,
      updateQuantity,
      removeItem,
      clearCart,
      isOpen,
      openCart,
      closeCart,
      waitForCartResolution,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
