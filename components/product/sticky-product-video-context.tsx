"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type StickyProductVideoContextValue = {
  visible: boolean;
  setVisible: (next: boolean) => void;
};

const StickyProductVideoContext = createContext<StickyProductVideoContextValue>({
  visible: false,
  setVisible: () => {},
});

export function StickyProductVideoProvider({ children }: { children: ReactNode }) {
  const [visible, setVisibleState] = useState(false);
  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);
  }, []);
  const value = useMemo(() => ({ visible, setVisible }), [visible, setVisible]);
  return (
    <StickyProductVideoContext.Provider value={value}>
      {children}
    </StickyProductVideoContext.Provider>
  );
}

export function useStickyProductVideoPresence() {
  return useContext(StickyProductVideoContext);
}
