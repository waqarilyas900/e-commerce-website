"use client";

import { useEffect } from "react";

const DEFAULT_STICKY_SCROLL_Y = 320;

export function HeaderStickyObserver() {
  useEffect(() => {
    const hero = document.querySelector("#MainContent > section:first-of-type") as HTMLElement | null;
    const triggerY = hero
      ? Math.max(DEFAULT_STICKY_SCROLL_Y, hero.offsetTop + hero.offsetHeight - 80)
      : DEFAULT_STICKY_SCROLL_Y;

    const onScroll = () => {
      const sticky = window.scrollY > triggerY;
      document.body.setAttribute("data-header-sticky", sticky ? "true" : "false");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.body.removeAttribute("data-header-sticky");
    };
  }, []);

  return null;
}
