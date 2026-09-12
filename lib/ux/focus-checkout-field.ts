/** Focus a checkout field (`co-{id}`) and scroll it into view. */
export function focusCheckoutField(fieldId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(`co-${fieldId}`);
  if (!(el instanceof HTMLElement)) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Scroll an element into view (e.g. submit error banner). */
export function scrollElementIntoView(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}
