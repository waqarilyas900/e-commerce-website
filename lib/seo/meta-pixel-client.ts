"use client";

import { STORE_CURRENCY_CODE } from "@/app/lib/format-currency";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
    google_tag_manager?: unknown;
  }
}

export type MetaTrackParams = Record<string, unknown>;
export type MetaUserData = {
  email?: string;
  phone?: string;
};

type MetaTrackOptions = {
  eventId?: string;
  eventSourceUrl?: string;
  userData?: MetaUserData;
  gtmEventName?: string;
  sendToServer?: boolean;
};

function metaDataLayerEventName(eventName: string): string {
  const snake = eventName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return snake ? `meta_${snake}` : "meta_event";
}

export function generateMetaEventId(eventName = "event"): string {
  const safeName = eventName
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "event";
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${safeName}-${random}`;
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return "";
}

function browserUserData(options: MetaTrackOptions): Record<string, string> {
  const userData: Record<string, string> = {};
  const email = options.userData?.email?.trim();
  if (email) userData.email = email;
  const phone = options.userData?.phone?.trim();
  if (phone) userData.phone = phone;
  const fbp = readCookie("_fbp");
  if (fbp) userData.fbp = fbp;
  const fbc = readCookie("_fbc");
  if (fbc) userData.fbc = fbc;
  return userData;
}

function hasGtmLoader(): boolean {
  if (typeof window === "undefined") return false;
  if (window.google_tag_manager) return true;
  return Boolean(
    window.dataLayer?.some(
      (item) =>
        item &&
        typeof item === "object" &&
        Object.prototype.hasOwnProperty.call(item, "gtm.start"),
    ),
  );
}

function pushMetaDataLayerEvent(
  eventName: string,
  eventId: string,
  params: MetaTrackParams,
  options: MetaTrackOptions,
): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: options.gtmEventName || metaDataLayerEventName(eventName),
    meta_event_name: eventName,
    event_id: eventId,
    eventID: eventId,
    ...params,
  });
}

function sendMetaCapiEvent(
  eventName: string,
  eventId: string,
  params: MetaTrackParams,
  options: MetaTrackOptions,
): void {
  if (options.sendToServer === false) return;
  const body = JSON.stringify({
    event_name: eventName,
    event_id: eventId,
    event_source_url:
      options.eventSourceUrl ||
      (typeof window !== "undefined" ? window.location.href : undefined),
    custom_data: params,
    user_data: browserUserData(options),
  });
  void fetch("/api/meta/capi", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: body.length < 60_000,
  }).catch(() => {
    // Never block UX for analytics issues.
  });
}

export function trackMetaPixel(
  eventName: string,
  params?: MetaTrackParams,
  options: MetaTrackOptions = {},
): string {
  const eventId = options.eventId || generateMetaEventId(eventName);
  if (typeof window === "undefined") return eventId;
  const payload = params ?? {};
  pushMetaDataLayerEvent(eventName, eventId, payload, options);
  sendMetaCapiEvent(eventName, eventId, payload, options);

  const fbq = window.fbq;
  if (typeof fbq !== "function") return eventId;
  try {
    if (hasGtmLoader()) return eventId;
    if (Object.keys(payload).length > 0) {
      fbq("track", eventName, payload, { eventID: eventId });
      return eventId;
    }
    fbq("track", eventName, {}, { eventID: eventId });
  } catch {
    // Never block UX for analytics issues.
  }
  return eventId;
}

export function toPkrValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

export function defaultMetaCurrency(): string {
  // Keep one currency source so all Meta events stay consistent.
  return STORE_CURRENCY_CODE;
}
