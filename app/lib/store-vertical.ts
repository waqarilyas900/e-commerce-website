import type { StoreVerticalId } from "./store-brand.types";

/**
 * Set per deployment on each server:
 * `NEXT_PUBLIC_STORE_VERTICAL=electronics` | `clothing` | `jewellery` | `home-compliance`
 */
export function getStoreVertical(): StoreVerticalId {
  const v = process.env.NEXT_PUBLIC_STORE_VERTICAL;
  if (
    v === "clothing" ||
    v === "jewellery" ||
    v === "home-compliance" ||
    v === "electronics"
  ) {
    return v;
  }
  return "electronics";
}
