/** Minimum time the add-to-cart primary button shows an inline loader (feedback before cart opens). */
export const ADD_TO_CART_BUTTON_MS = 420;

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
