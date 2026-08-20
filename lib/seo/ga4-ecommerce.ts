/**
 * GA4 ecommerce helpers — fires native gtag events for Google Ads / GA4.
 * Meta Pixel remains separate (trackMetaPixel); both can run from the same funnel.
 */
import { STORE_CURRENCY_CODE } from "@/app/lib/format-currency";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Ga4Item = {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

function toMoney(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

function itemsFromMetaParams(params: Record<string, unknown>): Ga4Item[] {
  const contents = Array.isArray(params.contents) ? params.contents : [];
  if (contents.length > 0) {
    return contents
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const c = raw as { id?: unknown; quantity?: unknown; item_price?: unknown };
        const id = typeof c.id === "string" ? c.id.trim() : "";
        if (!id) return null;
        const quantity = Math.max(1, Math.floor(Number(c.quantity) || 1));
        const item: Ga4Item = { item_id: id, quantity };
        if (c.item_price != null && Number.isFinite(Number(c.item_price))) {
          item.price = toMoney(c.item_price);
        }
        if (typeof params.content_name === "string" && params.content_name.trim()) {
          item.item_name = params.content_name.trim();
        }
        return item;
      })
      .filter((x): x is Ga4Item => x != null);
  }

  const ids = Array.isArray(params.content_ids)
    ? params.content_ids.filter((id): id is string => typeof id === "string" && id.trim() !== "")
    : [];
  return ids.map((id) => {
    const item: Ga4Item = { item_id: id.trim(), quantity: 1 };
    if (typeof params.content_name === "string" && params.content_name.trim()) {
      item.item_name = params.content_name.trim();
    }
    return item;
  });
}

const META_TO_GA4: Record<string, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
};

/**
 * Map Meta-style funnel params (already used on storefront) → GA4 recommended events.
 */
export function trackGa4Ecommerce(
  metaEventName: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;

  const ga4Event = META_TO_GA4[metaEventName];
  if (!ga4Event) return;

  try {
    const currency =
      (typeof params.currency === "string" && params.currency.trim()) || STORE_CURRENCY_CODE;
    const value = toMoney(params.value);
    const items = itemsFromMetaParams(params);

    if (ga4Event === "search") {
      const term =
        (typeof params.search_string === "string" && params.search_string) ||
        (typeof params.search_term === "string" && params.search_term) ||
        "";
      gtag("event", "search", { search_term: term });
      return;
    }

    if (ga4Event === "purchase") {
      const transactionId =
        (typeof params.order_id === "string" && params.order_id.trim()) ||
        (typeof params.transaction_id === "string" && params.transaction_id.trim()) ||
        "";
      if (!transactionId) return;
      gtag("event", "purchase", {
        transaction_id: transactionId,
        value,
        currency,
        items,
      });
      return;
    }

    gtag("event", ga4Event, {
      currency,
      value,
      items,
    });
  } catch {
    // Never block UX for analytics.
  }
}
