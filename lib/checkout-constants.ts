/**
 * Fallback when `store_settings` cannot be read (offline / schema not migrated yet).
 * Amounts are in paisa (1/100 PKR), matching `public.place_order` and `product_variants.price` scaling.
 */
export const FALLBACK_STANDARD_DELIVERY_PAISA = 50_000;

/** @deprecated Use FALLBACK_STANDARD_DELIVERY_PAISA or load from store_settings */
export const FALLBACK_STANDARD_DELIVERY_PKR = FALLBACK_STANDARD_DELIVERY_PAISA / 100;
