"use client";

import { useEffect } from "react";

/** Non-home pages: show sticky nav after a short scroll (homepage uses hero bottom). */
const DEFAULT_STICKY_SCROLL_Y = 320;

export function HeaderStickyObserver() {
  useEffect(() => {
    const getTriggerY = () => {
      // Only the homepage hero — NOT every page's first <section> (collections
      // wrap the full product grid in a section, which pushed sticky to page end).
      const hero = document.querySelector(
        "#shopify-section-template-hero",
      ) as HTMLElement | null;
      if (!hero) return DEFAULT_STICKY_SCROLL_Y;
      return Math.max(DEFAULT_STICKY_SCROLL_Y, hero.offsetTop + hero.offsetHeight - 80);
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
