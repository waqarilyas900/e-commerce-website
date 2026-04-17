import { hasCatalogDb } from "@/app/lib/db/env";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";
import { createClient } from "@/lib/supabase/client";

/** Matches `store_settings` row `id = 1` — same source as checkout / `place_order`. */
export type StoreDeliverySettingsState = {
  standardPaisa: number;
  freeThresholdsPaisa: number[];
};

/**
 * Loads standard delivery fee and free-delivery thresholds (paisa) from Supabase.
 * Returns `null` if offline, RLS blocks, or row missing — callers should fall back to constants.
 */
export async function fetchStoreDeliverySettings(): Promise<StoreDeliverySettingsState | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("standard_delivery_paisa, free_delivery_thresholds_paisa")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;

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

    return {
      standardPaisa: std,
      freeThresholdsPaisa: thresholds,
    };
  } catch {
    return null;
  }
}
