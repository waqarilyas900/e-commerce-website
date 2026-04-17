"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HeaderNavMenuItem } from "@/app/lib/header-nav-menu";

const HeaderNavMenuContext = createContext<HeaderNavMenuItem[] | null>(null);

export function HeaderNavMenuProvider({
  items,
  children,
}: {
  items: HeaderNavMenuItem[];
  children: ReactNode;
}) {
  return (
    <HeaderNavMenuContext.Provider value={items}>{children}</HeaderNavMenuContext.Provider>
  );
}

export function useHeaderNavMenuItems(): HeaderNavMenuItem[] {
  const ctx = useContext(HeaderNavMenuContext);
  return ctx ?? [];
}
