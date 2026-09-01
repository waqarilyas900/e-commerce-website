/** Brief loader flash on add-to-cart (0 = instant; was 420ms). */
export const ADD_TO_CART_BUTTON_MS = 0;

export function delayMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
