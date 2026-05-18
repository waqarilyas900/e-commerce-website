/** SessionStorage key: set on successful place order, read once on `/checkout/thank-you` */
export const CHECKOUT_THANK_YOU_META_KEY = "checkoutThankYouMeta";

/** Set with meta when order succeeds; thank-you clears cart only if present (avoids clearing on bookmarked URLs). */
export const CHECKOUT_PENDING_CART_CLEAR_KEY = "checkoutPendingCartClear";

/** Purchase payload persisted before redirect and consumed once on `/checkout/thank-you`. */
export const CHECKOUT_PENDING_PURCHASE_EVENT_KEY = "checkoutPendingPurchaseEvent";
