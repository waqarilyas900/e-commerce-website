/** Storefront WhatsApp deep links (wa.me) with optional product context. */

export function formatPhoneForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("92") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = formatPhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export type ProductWhatsAppContext = {
  productName: string;
  productUrl: string;
  /** Public image URL — WhatsApp may show a link preview when the chat opens. */
  imageUrl?: string;
  priceLabel?: string;
};

/** Prefill so Meta / site WhatsApp chats include product name + link (+ image URL). */
export function buildProductWhatsAppMessage(
  storeName: string,
  ctx: ProductWhatsAppContext,
): string {
  const name = ctx.productName.trim() || "this product";
  const lines = [
    `Hi ${storeName.trim() || "SimpleCart Store"},`,
    "",
    `I want to order: ${name}`,
  ];
  if (ctx.priceLabel?.trim()) {
    lines.push(`Price: ${ctx.priceLabel.trim()}`);
  }
  if (ctx.productUrl.trim()) {
    lines.push(`Product: ${ctx.productUrl.trim()}`);
  }
  if (ctx.imageUrl?.trim()) {
    lines.push(`Photo: ${ctx.imageUrl.trim()}`);
  }
  lines.push("", "Please confirm availability.");
  return lines.join("\n");
}

export function buildProductWhatsAppUrl(
  phone: string,
  storeName: string,
  ctx: ProductWhatsAppContext,
): string | null {
  return buildWhatsAppUrl(phone, buildProductWhatsAppMessage(storeName, ctx));
}
