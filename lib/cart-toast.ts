import { toast } from "sonner";

export function toastAddedToCart(options?: { title?: string; description?: string; quantity?: number }) {
  const q = options?.quantity ?? 1;
  const title = options?.title ?? "Added to cart";
  const desc =
    options?.description ??
    (q > 1 ? `${q} items are in your bag.` : "Item is in your bag — open the cart when you’re ready.");

  toast.success(title, {
    description: desc,
    duration: 3800,
  });
}

export function toastBundleAddedToCart(options?: { lineCount?: number }) {
  const n = options?.lineCount ?? 0;
  toast.success("Bundle added to cart", {
    description:
      n > 0
        ? `${n} item${n === 1 ? "" : "s"} from the bundle ${n === 1 ? "is" : "are"} in your bag.`
        : "Items from the bundle are in your bag.",
    duration: 4000,
  });
}
