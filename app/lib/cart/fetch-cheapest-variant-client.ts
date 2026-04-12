import { createClient } from "@/lib/supabase/client";

/** Cheapest sellable variant for quick-add (matches PLP default variant behavior). */
export async function fetchCheapestVariantForProductSlug(
  slug: string,
): Promise<{ variantId: string; productId: string } | null> {
  const supabase = createClient();
  const { data: p, error: pe } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (pe || !p?.id) return null;
  const { data: vars, error: ve } = await supabase
    .from("product_variants")
    .select("id, price")
    .eq("product_id", p.id)
    .order("price", { ascending: true })
    .limit(1);
  if (ve || !vars?.[0]?.id) return null;
  return { variantId: vars[0].id as string, productId: p.id as string };
}
