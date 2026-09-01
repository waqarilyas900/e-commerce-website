import { hasCatalogDb } from "@/app/lib/db/env";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";
import { createClient } from "@/lib/supabase/client";

/** Matches `store_settings` row `id = 1` — same source as checkout / `place_order`. */
export type StoreDeliverySettingsState = {
  standardPaisa: number;
  freeThresholdsPaisa: number[];
};

const DELIVERY_SETTINGS_CACHE_MS = 5 * 60 * 1000;
let deliverySettingsCache: StoreDeliverySettingsState | null | undefined;
let deliverySettingsCachedAt = 0;

/**
 * Loads standard delivery fee and free-delivery thresholds (paisa) from Supabase.
 * Returns `null` if offline, RLS blocks, or row missing — callers should fall back to constants.
 */
export async function fetchStoreDeliverySettings(): Promise<StoreDeliverySettingsState | null> {
  const now = Date.now();
  if (
    deliverySettingsCache !== undefined &&
    now - deliverySettingsCachedAt < DELIVERY_SETTINGS_CACHE_MS
  ) {
    return deliverySettingsCache;
  }

  if (!hasCatalogDb()) {
    deliverySettingsCache = null;
    deliverySettingsCachedAt = now;
    return null;
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("standard_delivery_paisa, free_delivery_thresholds_paisa")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      deliverySettingsCache = null;
      deliverySettingsCachedAt = now;
      return null;
    }

    const raw = (data as { free_delivery_thresholds_paisa?: unknown }).free_delivery_thresholds_paisa;
    const thresholds: number[] = [];
    if (Array.isArray(raw)) {
      for (const x of raw) {
        const n = typeof x === "number" ? x : Number(x);
        if (Number.isFinite(n) && n >= 0) thresholds.push(Math.round(n));
      }
    }

    const std = Math.max(
      0,
      Math.round(
        Number(
          (data as { standard_delivery_paisa?: number }).standard_delivery_paisa ??
            FALLBACK_STANDARD_DELIVERY_PAISA,
        ),
      ),
    );

    const result = {
      standardPaisa: std,
      freeThresholdsPaisa: thresholds,
    };
    deliverySettingsCache = result;
    deliverySettingsCachedAt = now;
    return result;
  } catch {
    deliverySettingsCache = null;
    deliverySettingsCachedAt = now;
    return null;
  }
}
