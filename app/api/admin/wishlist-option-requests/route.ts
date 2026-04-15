import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/wishlist-option-requests
 * Active admins — wishlist rows with no `product_variant_id` (requested option snapshot only).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_id", session.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      "id, user_id, created_at, requested_option_values, notify_on_restock, product_id, users(first_name,last_name), products(name,slug)",
    )
    .is("product_variant_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data ?? [] });
}
