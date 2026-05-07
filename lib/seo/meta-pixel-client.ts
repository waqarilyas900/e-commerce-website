"use client";

import { STORE_CURRENCY_CODE } from "@/app/lib/format-currency";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type MetaTrackParams = Record<string, unknown>;

export function trackMetaPixel(eventName: string, params?: MetaTrackParams): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  try {
    if (params && Object.keys(params).length > 0) {
      fbq("track", eventName, params);
      return;
    }
    fbq("track", eventName);
  } catch {
    // Never block UX for analytics issues.
  }
}

export function toPkrValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

export function defaultMetaCurrency(): string {
  return STORE_CURRENCY_CODE;
}
