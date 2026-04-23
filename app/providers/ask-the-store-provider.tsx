"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AskTheStoreContextValue = {
  open: boolean;
  openAskStore: () => void;
  closeAskStore: () => void;
};

const AskTheStoreContext = createContext<AskTheStoreContextValue | null>(null);

export function AskTheStoreProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openAskStore = useCallback(() => setOpen(true), []);
  const closeAskStore = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openAskStore, closeAskStore }),
    [open, openAskStore, closeAskStore],
  );
  return <AskTheStoreContext.Provider value={value}>{children}</AskTheStoreContext.Provider>;
}

export function useAskTheStore(): AskTheStoreContextValue {
  const ctx = useContext(AskTheStoreContext);
  if (!ctx) {
    throw new Error("useAskTheStore must be used within AskTheStoreProvider");
  }
  return ctx;
}
