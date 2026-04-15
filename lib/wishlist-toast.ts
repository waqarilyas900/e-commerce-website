import { toast } from "sonner";

export function toastWishlistAdded(productName?: string, options?: { restockNotify?: boolean }) {
  const restock = options?.restockNotify;
  toast.success("Product added to wishlist", {
    description: restock
      ? productName
        ? `${productName} — we’ll email you when this option is back in stock.`
        : "We’ll email you when this option is back in stock."
      : productName
        ? `${productName} is saved — open your account when you’re ready.`
        : "Saved to your wishlist.",
    duration: restock ? 4200 : 3800,
  });
}

export function toastWishlistRemoved() {
  toast.success("Removed from wishlist", { duration: 3200 });
}

export function toastRestockNotifyOn() {
  toast.success("You’ll be emailed when it’s back", {
    description: "We’ll send one message when this option is available again.",
    duration: 4200,
  });
}

export function toastRestockNotifyOff() {
  toast.success("Restock alerts off", { duration: 2800 });
}
