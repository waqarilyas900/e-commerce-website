/** Shared labels/formatting for account order UI (DB enums as strings). */

export function formatOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function formatPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cod: "Cash on delivery",
    card: "Card",
    bank_transfer: "Bank transfer",
    wallet: "Wallet",
  };
  return labels[method] ?? method.replace(/_/g, " ");
}

export function formatOptionLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Renders option_values / option_values_snapshot json as "Size: M · Color: Black". */
export function formatOptionSnapshot(v: unknown): string {
  if (!v || typeof v !== "object" || Array.isArray(v)) return "";
  const o = v as Record<string, unknown>;
  const parts: string[] = [];
  for (const [k, val] of Object.entries(o)) {
    if (val === null || val === undefined || val === "") continue;
    parts.push(`${formatOptionLabel(k)}: ${String(val)}`);
  }
  return parts.join(" · ");
}

export function firstProductImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  return typeof first === "string" && first.length > 0 ? first : null;
}
