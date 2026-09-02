import { createClient } from "@/lib/supabase/server";

export type WishlistPageItem = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  freeDelivery: boolean;
  variantId: string | null;
  variantLabel: string;
  unitPrice: number | null;
  sellableQty: number;
  notifyOnRestock: boolean;
  /** Option snapshot with no SKU yet — view product to pick options */
  isOptionRequest: boolean;
  optionSummary: string;
  createdAt: string;
};

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

function formatOptionLabel(values: Record<string, unknown> | null | undefined): string {
  if (!values || typeof values !== "object") return "";
  const entries = Object.entries(values).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (!entries.length) return "";
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
}

function embedOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

type InventoryEmbed = {
  quantity_on_hand: number | null;
  quantity_reserved: number | null;
};

type VariantEmbed = {
  id: string;
  price: number | string | null;
  option_values: Record<string, unknown> | null;
  sku: string | null;
  inventory: InventoryEmbed | InventoryEmbed[] | null;
};

type ProductEmbed = {
  id: string;
  slug: string;
  name: string;
  images: unknown;
  free_delivery: boolean | null;
};

type WishlistDbRow = {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  requested_option_values: Record<string, unknown> | null;
  notify_on_restock: boolean;
  created_at: string;
  products: ProductEmbed | ProductEmbed[] | null;
  product_variants: VariantEmbed | VariantEmbed[] | null;
};

export async function loadAccountWishlistItems(): Promise<{
  items: WishlistPageItem[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { items: [], error: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const userId = profile?.id as string | undefined;
  if (!userId) {
    return { items: [], error: null };
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `
      id,
      product_id,
      product_variant_id,
      requested_option_values,
      notify_on_restock,
      created_at,
      products ( id, slug, name, images, free_delivery ),
      product_variants (
        id,
        price,
        option_values,
        sku,
        inventory ( quantity_on_hand, quantity_reserved )
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }

  const items: WishlistPageItem[] = [];
  for (const raw of (data ?? []) as WishlistDbRow[]) {
    const product = embedOne(raw.products);
    if (!product?.slug || !product.name) continue;

    const variant = embedOne(raw.product_variants);
    const inv = variant ? embedOne(variant.inventory) : null;
    const sellableQty = inv
      ? Math.max(
          0,
          Number(inv.quantity_on_hand ?? 0) - Number(inv.quantity_reserved ?? 0),
        )
      : 0;

    const isOptionRequest = !raw.product_variant_id;
    const variantLabel = variant
      ? formatOptionLabel(variant.option_values)
      : "";
    const optionSummary = isOptionRequest
      ? formatOptionLabel(raw.requested_option_values)
      : variantLabel;

    items.push({
      id: raw.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: firstImage(product.images),
      freeDelivery: Boolean(product.free_delivery),
      variantId: variant?.id ?? null,
      variantLabel,
      unitPrice: variant?.price != null ? Number(variant.price) : null,
      sellableQty,
      notifyOnRestock: Boolean(raw.notify_on_restock),
      isOptionRequest,
      optionSummary,
      createdAt: raw.created_at,
    });
  }

  return { items, error: null };
}
