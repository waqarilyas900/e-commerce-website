"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/app/lib/catalog/types";

type ProductPreviewContextValue = {
  product: Product | null;
  isOpen: boolean;
  openPreview: (product: Product) => void;
  closePreview: () => void;
};

const ProductPreviewContext = createContext<ProductPreviewContextValue | null>(
  null,
);

export function ProductPreviewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);

  const openPreview = useCallback((p: Product) => {
    setProduct(p);
  }, []);

  const closePreview = useCallback(() => {
    setProduct(null);
  }, []);

  const value = useMemo(
    () => ({
      product,
      isOpen: product != null,
      openPreview,
      closePreview,
    }),
    [product, openPreview, closePreview],
  );

  return (
    <ProductPreviewContext.Provider value={value}>
      {children}
    </ProductPreviewContext.Provider>
  );
}

export function useProductPreview() {
  const ctx = useContext(ProductPreviewContext);
  if (!ctx) {
    throw new Error("useProductPreview must be used within ProductPreviewProvider");
  }
  return ctx;
}
