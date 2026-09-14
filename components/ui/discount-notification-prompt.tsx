"use client";

import { useEffect, useState } from "react";
import { SiteLogoMark } from "@/components/site-logo";

const DISMISS_KEY = "discount-notification-prompt-dismissed-v1";
const ALLOWED_KEY = "discount-notification-prompt-allowed-v1";
const VISIT_KEY = "discount-notification-prompt-visits-v1";

/**
 * Quiet permission prompt — waits for a return visit + scroll, never on first paint.
 */
export function DiscountNotificationPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (window.Notification.permission !== "default") return;
    if (localStorage.getItem(ALLOWED_KEY) === "1") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    let visits = 0;
    try {
      visits = Number(localStorage.getItem(VISIT_KEY) || "0") || 0;
      visits += 1;
      localStorage.setItem(VISIT_KEY, String(visits));
    } catch {
      visits = 1;
    }

    // First visit: never interrupt. From 2nd visit onward, wait for scroll + delay.
    if (visits < 2) return;

    let shown = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrolled = false;

    const tryShow = () => {
      if (shown || !scrolled) return;
      shown = true;
      const delayMs = 12000 + Math.floor(Math.random() * 8000);
      timer = setTimeout(() => setOpen(true), delayMs);
    };

    const onScroll = () => {
      if (window.scrollY < Math.min(420, window.innerHeight * 0.45)) return;
      scrolled = true;
      window.removeEventListener("scroll", onScroll);
      tryShow();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore private mode */
    }
  };

  const onAllow = async () => {
    close();
    try {
      if ("Notification" in window) {
        const permission = await window.Notification.requestPermission();
        if (permission === "granted") {
          try {
            localStorage.setItem(ALLOWED_KEY, "1");
          } catch {
            /* ignore private mode */
          }
        }
      }
    } finally {
      /* already closed before prompting */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-3 z-120 w-[min(94vw,420px)] -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_10px_28px_rgba(0,0,0,0.24)] sm:top-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex items-center gap-2.5 sm:mt-0.5 sm:block sm:shrink-0">
          <SiteLogoMark size="compact" />
          <h3 className="text-sm font-semibold uppercase tracking-tight text-neutral-900 sm:hidden">
            Get discounts ⚡
          </h3>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="hidden text-base font-semibold uppercase tracking-tight text-neutral-900 sm:block">
            Get discounts ⚡
          </h3>
          <p className="text-[13px] leading-snug text-neutral-600 sm:mt-0.5 sm:text-sm">
            Click the button below and be the first to know about the best discounts.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={close}
              className="min-h-10 rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 sm:min-h-0 sm:py-1.5"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => void onAllow()}
              className="min-h-10 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:min-h-0 sm:px-4 sm:py-1.5"
            >
              Get Discounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
