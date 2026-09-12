"use client";

import { useEffect } from "react";

/**
 * Persist window scroll for listing pages so returning from a PDP
 * restores position (Next App Router often resets to top).
 */
export function useListScrollRestore(storageKey: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let restored = false;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw != null) {
        const y = Number(raw);
        if (Number.isFinite(y) && y > 0) {
          restored = true;
          const apply = () => window.scrollTo(0, y);
          requestAnimationFrame(() => {
            apply();
            requestAnimationFrame(apply);
          });
          window.setTimeout(apply, 50);
          window.setTimeout(apply, 200);
        }
      }
    } catch {
      /* private mode */
    }

    let timer = 0;
    const save = () => {
      try {
        sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
      } catch {
        /* private mode */
      }
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 120);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);

    return () => {
      if (!restored) save();
      else save();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [storageKey]);
}
