/**
 * Storefront prices are displayed in Pakistani Rupees (PKR).
 * Amounts match `product_variants.price` (rupees, optional decimals).
 */
export function formatPkr(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const STORE_CURRENCY_CODE = "PKR" as const;
