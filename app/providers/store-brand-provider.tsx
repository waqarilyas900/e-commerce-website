"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoreBrandConfig } from "@/app/lib/store-brand.types";

const StoreBrandContext = createContext<StoreBrandConfig | null>(null);

export function StoreBrandProvider({
  brand,
  children,
}: {
  brand: StoreBrandConfig;
  children: ReactNode;
}) {
  return (
    <StoreBrandContext.Provider value={brand}>{children}</StoreBrandContext.Provider>
  );
}

export function useStoreBrand(): StoreBrandConfig {
  const ctx = useContext(StoreBrandContext);
  if (!ctx) {
    throw new Error("useStoreBrand must be used within StoreBrandProvider");
  }
  return ctx;
}
