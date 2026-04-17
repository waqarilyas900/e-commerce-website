"use client";

import { useEffect } from "react";

/**
 * Reference-counted document scroll lock for stacked modals/drawers.
 * Compensates for scrollbar width to reduce layout shift when `overflow: hidden` is applied.
 */

let depth = 0;
let savedHtmlOverflow = "";
let savedBodyOverflow = "";
let savedBodyPaddingRight = "";

function scrollbarWidthPx(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

/** Acquire one lock (nested overlays each call once). */
export function lockScroll(): void {
  if (typeof document === "undefined") return;
  if (depth === 0) {
    const html = document.documentElement;
    const body = document.body;
    const sbw = scrollbarWidthPx();
    savedHtmlOverflow = html.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedBodyPaddingRight = body.style.paddingRight;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (sbw > 0) {
      body.style.paddingRight = `${sbw}px`;
    }
  }
  depth += 1;
}

/** Release one lock. When the last lock is released, styles are restored. */
export function unlockScroll(): void {
  if (typeof document === "undefined") return;
  if (depth <= 0) return;
  depth -= 1;
  if (depth > 0) return;
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = savedHtmlOverflow;
  body.style.overflow = savedBodyOverflow;
  body.style.paddingRight = savedBodyPaddingRight;
  savedHtmlOverflow = "";
  savedBodyOverflow = "";
  savedBodyPaddingRight = "";
}

/**
 * Lock while `locked` is true; automatically pairs lock/unlock for React lifecycle
 * (Strict Mode–safe).
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [locked]);
}
