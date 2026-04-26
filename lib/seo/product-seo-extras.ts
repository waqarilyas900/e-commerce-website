/**
 * Optional SEO/Shopping fields for a product, stored 1:1 in
 * `public.product_shopping_attributes` (added by the SEO migration).
 *
 * Reads gracefully — if the migration hasn't been applied or the row doesn't
 * exist yet, returns an empty struct and the storefront falls back to org-level
 * brand and computed values.
 */

import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";

export type ProductSeoExtras = {
  brandName: string;
  gtin: string;
  mpn: string;
  countryOfOrigin: string;
  material: string;
  isOriginalImagery: boolean;
  returnPolicyId: string | null;
  shippingPolicyId: string | null;
};

const EMPTY: ProductSeoExtras = {
  brandName: "",
  gtin: "",
  mpn: "",
  countryOfOrigin: "",
  material: "",
  isOriginalImagery: false,
  returnPolicyId: null,
  shippingPolicyId: null,
};

export async function loadProductSeoExtras(productId: string): Promise<ProductSeoExtras> {
  if (!productId || !hasCatalogDb()) return EMPTY;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_shopping_attributes")
      .select(
        "brand_name, gtin, mpn, country_of_origin, material, is_original_imagery, return_policy_id, shipping_policy_id",
      )
      .eq("product_id", productId)
      .maybeSingle();
    if (error || !data) return EMPTY;
    const row = data as unknown as Record<string, unknown>;
    return {
      brandName: String(row.brand_name ?? "").trim(),
      gtin: String(row.gtin ?? "").trim(),
      mpn: String(row.mpn ?? "").trim(),
      countryOfOrigin: String(row.country_of_origin ?? "").trim(),
      material: String(row.material ?? "").trim(),
      isOriginalImagery: Boolean(row.is_original_imagery),
      returnPolicyId:
        typeof row.return_policy_id === "string" && row.return_policy_id ? row.return_policy_id : null,
      shippingPolicyId:
        typeof row.shipping_policy_id === "string" && row.shipping_policy_id ? row.shipping_policy_id : null,
    };
  } catch {
    return EMPTY;
  }
}
