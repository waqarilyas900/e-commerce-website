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

const STORAGE_KEY = "storefront-cart-v2";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CartLine = {
  variantId: string;
  productId: string;
  quantity: number;
};

export type ResolvedCartLine = {
  line: CartLine;
  unitPrice: number;
  product: {
    id: string;
    slug: string;
    name: string;
    image: string;
    /** Product-level opt-in; that line's total is excluded from shipping basis. */
    freeDelivery: boolean;
  };
  variantLabel: string;
};

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
  /** True while Supabase is resolving `lines` into `resolvedLines` (checkout should wait). */
  isResolvingCart: boolean;
  itemCount: number;
  subtotal: number;
  resolvedLines: ResolvedCartLine[];
  addVariant: (variantId: string, productId: string, quantity?: number) => void;
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

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const trimmed = raw.trim();
    if (trimmed === "") return [];
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    const lines: CartLine[] = [];
    for (const row of parsed) {
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
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
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
      if (stored.length > 0 && hasCatalogDb()) {
        setIsResolvingCart(true);
      }
      setLines(stored);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStorage(lines);
  }, [lines, ready]);

  useEffect(() => {
    if (!ready || !hasCatalogDb() || lines.length === 0) {
      setResolvedLines([]);
      setIsResolvingCart(false);
      flushCartResolutionWaiters(resolutionWaiters);
      return;
    }

    let cancelled = false;
    setIsResolvingCart(true);

    void (async () => {
      try {
        const supabase = createClient();
        const ids = [...new Set(lines.map((l) => l.variantId))];

        /** Two queries avoid nested `products()` embeds returning null under RLS / PostgREST. */
        const { data: variantRows, error: vErr } = await supabase
          .from("product_variants")
          .select("id, price, option_values, product_id")
          .in("id", ids);

        if (vErr || !variantRows?.length || cancelled) {
          if (vErr) console.error("[cart] resolve variants", vErr.message);
          if (!cancelled) setResolvedLines([]);
          return;
        }

        const pidSet = new Set<string>();
        for (const row of variantRows) {
          const pid = row.product_id as string | null | undefined;
          if (pid) pidSet.add(pid);
        }
        for (const line of lines) {
          if (line.productId) pidSet.add(line.productId);
        }
        const productIds = [...pidSet];

        const { data: productRows, error: pErr } =
          productIds.length > 0
            ? await supabase
                .from("products")
                .select("id, slug, name, images, free_delivery")
                .in("id", productIds)
            : { data: [], error: null };

        if (pErr || cancelled) {
          if (pErr) console.error("[cart] resolve products", pErr.message);
          if (!cancelled) setResolvedLines([]);
          return;
        }

        const byProductId = new Map(
          (productRows ?? []).map((p) => [
            p.id as string,
            p as {
              id: string;
              slug: string;
              name: string;
              images: unknown;
              free_delivery?: boolean | null;
            },
          ]),
        );

        const byVariantId = new Map(
          variantRows.map((row) => [
            row.id as string,
            {
              price: Number(row.price),
              option_values: (row.option_values ?? {}) as Record<string, string>,
              productId: row.product_id as string,
            },
          ]),
        );

        const resolved: ResolvedCartLine[] = [];
        for (const line of lines) {
          const vr = byVariantId.get(line.variantId);
          if (!vr) continue;
          const pr =
            byProductId.get(vr.productId) ?? byProductId.get(line.productId);
          if (!pr) continue;
          resolved.push({
            line,
            unitPrice: vr.price,
            product: {
              id: pr.id,
              slug: pr.slug,
              name: pr.name,
              image: firstImage(pr.images),
              freeDelivery: Boolean(pr.free_delivery),
            },
            variantLabel: formatVariantLabel(vr.option_values),
          });
        }

        if (!cancelled) setResolvedLines(resolved);
      } catch (e) {
        console.error("[cart] resolve", e);
        if (!cancelled) setResolvedLines([]);
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

  /** Covers fast resolve finishing before a `waitForCartResolution` waiter is queued. */
  useEffect(() => {
    if (resolvedLines.length > 0) {
      flushCartResolutionWaiters(resolutionWaiters);
    }
  }, [resolvedLines]);

  const waitForCartResolution = useCallback(async () => {
    await new Promise<void>((r) => queueMicrotask(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    if (!hasCatalogDb()) return;
    if (linesRef.current.length === 0) return;
    if (resolvedRef.current.length > 0) return;
    await Promise.race([
      new Promise<void>((resolve) => {
        resolutionWaiters.current.push(resolve);
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 12_000)),
    ]);
  }, []);

  const setLinesSafe = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => updater(prev));
  }, []);

  const addVariant = useCallback(
    (variantId: string, productId: string, quantity = 1) => {
      if (!isUuid(variantId)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[cart] addVariant ignored invalid variant id", variantId);
        }
        return;
      }
      const q = Math.max(1, Math.min(99, Math.floor(quantity)));
      setLinesSafe((prev) => {
        const i = prev.findIndex((l) => l.variantId === variantId);
        if (i >= 0) {
          const next = [...prev];
          next[i] = {
            ...next[i],
            quantity: Math.min(99, next[i].quantity + q),
          };
          return next;
        }
        return [...prev, { variantId, productId, quantity: q }];
      });
    },
    [setLinesSafe],
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const q = Math.floor(quantity);
      if (q < 1) {
        setLinesSafe((prev) => prev.filter((l) => l.variantId !== variantId));
        return;
      }
      setLinesSafe((prev) => {
        const i = prev.findIndex((l) => l.variantId === variantId);
        if (i < 0) return prev;
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(99, q) };
        return next;
      });
    },
    [setLinesSafe],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      setLinesSafe((prev) => prev.filter((l) => l.variantId !== variantId));
    },
    [setLinesSafe],
  );

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  /** Use raw line quantities until Supabase resolves variants (avoids 0 badge / “empty” flash). */
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
