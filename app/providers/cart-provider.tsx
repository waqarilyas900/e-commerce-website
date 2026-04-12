"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { hasCatalogDb } from "@/app/lib/db/env";

const STORAGE_KEY = "storefront-cart-v2";

export type CartLine = {
  variantId: string;
  productId: string;
  quantity: number;
};

export type ResolvedCartLine = {
  line: CartLine;
  unitPrice: number;
  product: { id: string; slug: string; name: string; image: string };
  variantLabel: string;
};

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedLines, setResolvedLines] = useState<ResolvedCartLine[]>([]);

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
      setLines(readStorage());
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
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const supabase = createClient();
        const ids = [...new Set(lines.map((l) => l.variantId))];
        const { data, error } = await supabase
          .from("product_variants")
          .select(
            "id, price, option_values, product_id, products(id, slug, name, images)",
          )
          .in("id", ids);

        if (error || !data || cancelled) {
          if (error) console.error("[cart] resolve", error.message);
          if (!cancelled) setResolvedLines([]);
          return;
        }

        const byVariant = new Map(
          data.map((row: Record<string, unknown>) => {
            const pr = row.products as
              | { id: string; slug: string; name: string; images: unknown }
              | null
              | undefined;
            return [
              row.id as string,
              {
                price: Number(row.price),
                option_values: (row.option_values ?? {}) as Record<string, string>,
                product: pr,
              },
            ];
          }),
        );

        const resolved: ResolvedCartLine[] = [];
        for (const line of lines) {
          const v = byVariant.get(line.variantId);
          if (!v?.product) continue;
          resolved.push({
            line,
            unitPrice: v.price,
            product: {
              id: v.product.id,
              slug: v.product.slug,
              name: v.product.name,
              image: firstImage(v.product.images),
            },
            variantLabel: formatVariantLabel(v.option_values),
          });
        }

        if (!cancelled) setResolvedLines(resolved);
      } catch (e) {
        console.error("[cart] resolve", e);
        if (!cancelled) setResolvedLines([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lines, ready]);

  const setLinesSafe = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => updater(prev));
  }, []);

  const addVariant = useCallback(
    (variantId: string, productId: string, quantity = 1) => {
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

  const itemCount = useMemo(
    () => resolvedLines.reduce((n, { line }) => n + line.quantity, 0),
    [resolvedLines],
  );

  const subtotal = useMemo(
    () =>
      resolvedLines.reduce((sum, { line, unitPrice }) => sum + unitPrice * line.quantity, 0),
    [resolvedLines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      lines,
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
    }),
    [
      ready,
      lines,
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
