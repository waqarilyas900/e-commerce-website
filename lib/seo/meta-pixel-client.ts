"use client";

import { STORE_CURRENCY_CODE } from "@/app/lib/format-currency";
import { createClient } from "@/lib/supabase/client";

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
  external_id?: string;
  externalId?: string;
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
  const externalId =
    options.userData?.external_id?.trim() || options.userData?.externalId?.trim();
  if (externalId) userData.external_id = externalId;
  const fbp = readCookie("_fbp");
  if (fbp) userData.fbp = fbp;
  const fbc = readCookie("_fbc");
  if (fbc) userData.fbc = fbc;
  return userData;
}

function metaCapiEdgeUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_META_CAPI_EDGE_URL?.trim();
  if (explicit) return explicit;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/meta-capi`;
}

async function metaCapiAuthHeaders(): Promise<Record<string, string>> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const headers: Record<string, string> = {};
  if (anonKey) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
  }
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token?.trim();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  } catch {
    // Anonymous events still use the public anon key when configured.
  }
  return headers;
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

function capiRequestBody(
  eventName: string,
  eventId: string,
  params: MetaTrackParams,
  options: MetaTrackOptions,
): string {
  return JSON.stringify({
    event_name: eventName,
    event_id: eventId,
    event_source_url:
      options.eventSourceUrl ||
      (typeof window !== "undefined" ? window.location.href : undefined),
    custom_data: params,
    user_data: browserUserData(options),
  });
}

async function postMetaCapiEvent(url: string, body: string): Promise<boolean> {
  const headers = await metaCapiAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body,
    keepalive: body.length < 60_000,
  });
  return res.ok;
}

function sendMetaCapiEvent(
  eventName: string,
  eventId: string,
  params: MetaTrackParams,
  options: MetaTrackOptions,
): void {
  if (options.sendToServer === false) return;
  const body = capiRequestBody(eventName, eventId, params, options);
  void (async () => {
    const edgeUrl = metaCapiEdgeUrl();
    if (edgeUrl && (await postMetaCapiEvent(edgeUrl, body).catch(() => false))) {
      return;
    }
    await fetch("/api/meta/capi", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: body.length < 60_000,
    }).catch(() => undefined);
  })();
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
