"use client";

import { useEffect } from "react";

const DEFAULT_STICKY_SCROLL_Y = 320;

export function HeaderStickyObserver() {
  useEffect(() => {
    const getTriggerY = () => {
      const hero = document.querySelector("#MainContent > section:first-of-type") as HTMLElement | null;
      return hero
        ? Math.max(DEFAULT_STICKY_SCROLL_Y, hero.offsetTop + hero.offsetHeight - 80)
        : DEFAULT_STICKY_SCROLL_Y;
    };

    const onScroll = () => {
      const triggerY = getTriggerY();
      const sticky = window.scrollY > triggerY;
      document.body.setAttribute("data-header-sticky", sticky ? "true" : "false");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.body.removeAttribute("data-header-sticky");
    };
  }, []);

  return null;
}
