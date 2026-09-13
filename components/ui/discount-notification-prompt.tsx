"use client";

import { useEffect, useState } from "react";
import { SiteLogoMark } from "@/components/site-logo";

const DISMISS_KEY = "discount-notification-prompt-dismissed-v1";
const ALLOWED_KEY = "discount-notification-prompt-allowed-v1";

export function DiscountNotificationPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (window.Notification.permission !== "default") return;
    if (localStorage.getItem(ALLOWED_KEY) === "1") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const delayMs = 5000 + Math.floor(Math.random() * 5001);
    const timer = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timer);
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
