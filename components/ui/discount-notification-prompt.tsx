"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
    <div className="fixed left-1/2 top-4 z-[120] w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Image src="/dummy-logo.svg" alt="" width={42} height={42} className="h-10 w-10" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold uppercase tracking-tight text-neutral-900">
            Get discounts ⚡
          </h3>
          <p className="mt-0.5 text-sm leading-snug text-neutral-600">
            Click the button below and be the first to know about the best discounts.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => void onAllow()}
              className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Get Discounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
