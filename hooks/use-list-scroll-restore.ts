"use client";

import { useEffect } from "react";

/**
 * Persist window scroll for listing pages so returning from a PDP
 * restores position (Next App Router often resets to top).
 */
export function useListScrollRestore(storageKey: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const readY = (): number | null => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw == null) return null;
        const y = Number(raw);
        return Number.isFinite(y) && y > 0 ? y : null;
      } catch {
        return null;
      }
    };

    const save = () => {
      try {
        sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
      } catch {
        /* private mode */
      }
    };

    let restored = false;
    const y = readY();
    if (y != null) {
      restored = true;
      const apply = () => window.scrollTo(0, y);
      requestAnimationFrame(() => {
        apply();
        requestAnimationFrame(apply);
      });
      window.setTimeout(apply, 50);
      window.setTimeout(apply, 200);
      window.setTimeout(apply, 450);
      window.setTimeout(apply, 900);
    }

    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 100);
    };

    /** Save immediately when user opens a product (bfcache / fast nav). */
    const onClickCapture = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const a = t.closest('a[href^="/products/"]');
      if (!a) return;
      save();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      save();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("click", onClickCapture, true);
      void restored;
    };
  }, [storageKey]);
}
