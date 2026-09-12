/** Show urgency copy on PDP when sellable units are at or below this threshold. */
export const LOW_STOCK_THRESHOLD = 5;

export function isLowStock(maxQty: number): boolean {
  return maxQty > 0 && maxQty <= LOW_STOCK_THRESHOLD;
}

export function formatPurchaseStockMessage(maxQty: number): string {
  if (maxQty < 1) return "Out of stock";
  if (isLowStock(maxQty)) {
    return maxQty === 1 ? "Only 1 left" : `Only ${maxQty} left`;
  }
  return "In stock";
}
