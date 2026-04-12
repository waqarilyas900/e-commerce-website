"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NavCollectionLink } from "@/app/lib/nav-collections";

const NavCollectionsContext = createContext<NavCollectionLink[] | null>(null);

export function NavCollectionsProvider({
  links,
  children,
}: {
  links: NavCollectionLink[];
  children: ReactNode;
}) {
  return (
    <NavCollectionsContext.Provider value={links}>{children}</NavCollectionsContext.Provider>
  );
}

export function useNavCollections(): NavCollectionLink[] {
  const ctx = useContext(NavCollectionsContext);
  return ctx ?? [];
}
