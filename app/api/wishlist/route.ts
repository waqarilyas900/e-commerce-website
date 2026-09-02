import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canonicalOptionJson } from "@/lib/wishlist-fingerprint";

function serverOptionFingerprint(
  dimensionKeys: string[],
  selection: Record<string, string>,
): string {
  return createHash("sha256")
    .update(canonicalOptionJson(dimensionKeys, selection), "utf8")
    .digest("hex");
}

async function getAppUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .maybeSingle();
  return data?.id ?? null;
}

async function sellableForVariant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantId: string,
): Promise<number> {
  const { data } = await supabase
    .from("inventory")
    .select("quantity_on_hand, quantity_reserved")
    .eq("product_variant_id", variantId)
    .maybeSingle();
  if (!data) return 0;
  const qoh = Number(data.quantity_on_hand ?? 0);
  const res = Number(data.quantity_reserved ?? 0);
  return Math.max(0, qoh - res);
}

/**
 * GET /api/wishlist?variants=id,id&productId=&optionFp=
 * - `variants`: variant UUIDs to check (in-wishlist for logged-in user)
 * - `productId` + `optionFp`: check option-snapshot row (no SKU yet)
 * - `bulk=1` + `productId` (+ `variants`): also return `optionSnapshotFingerprints[]` for this product (PDP prefetch)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("variants") ?? "";
  const variantIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const productId = url.searchParams.get("productId")?.trim() ?? "";
  const optionFp = url.searchParams.get("optionFp")?.trim() ?? "";
  const bulk = url.searchParams.get("bulk") === "1";

  const variants: Record<string, { inWishlist: boolean }> = {};
  for (const id of variantIds) {
    variants[id] = { inWishlist: false };
  }

  let optionRequest: { inWishlist: boolean } | undefined;
  let optionSnapshotFingerprints: string[] | undefined;

  if (!user) {
    if (productId && optionFp) {
      optionRequest = { inWishlist: false };
    }
    if (bulk && productId) {
      optionSnapshotFingerprints = [];
    }
    return NextResponse.json({ variants, optionRequest, optionSnapshotFingerprints });
  }

  const userId = await getAppUserId(supabase, user.id);
  if (!userId) {
    return NextResponse.json({
      variants,
      optionRequest: { inWishlist: false },
      optionSnapshotFingerprints: bulk && productId ? [] : undefined,
    });
  }

  if (variantIds.length > 0) {
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("product_variant_id")
      .eq("user_id", userId)
      .in("product_variant_id", variantIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    for (const row of data ?? []) {
      const vid = (row as { product_variant_id: string }).product_variant_id;
      if (vid && variants[vid]) {
        variants[vid] = { inWishlist: true };
      }
    }
  }

  if (bulk && productId) {
    const { data: snapRows, error: snapErr } = await supabase
      .from("wishlist_items")
      .select("option_request_fingerprint")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .is("product_variant_id", null);

    if (snapErr) {
      return NextResponse.json({ error: snapErr.message }, { status: 400 });
    }
    optionSnapshotFingerprints = (snapRows ?? [])
      .map((r) => (r as { option_request_fingerprint: string | null }).option_request_fingerprint)
      .filter((fp): fp is string => Boolean(fp));
  }

  if (productId && optionFp) {
    const { data: optRow } = await supabase
      .from("wishlist_items")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("option_request_fingerprint", optionFp)
      .is("product_variant_id", null)
      .maybeSingle();
    optionRequest = { inWishlist: Boolean(optRow) };
  }

  return NextResponse.json({ variants, optionRequest, optionSnapshotFingerprints });
}

type PostBody = {
  productId?: string;
  inWishlist: boolean;
  /** When set, row is tied to this SKU */
  productVariantId?: string | null;
  /** Wishlist page remove: delete by primary key (must belong to user) */
  wishlistItemId?: string | null;
  /** When no variant: full option map + keys (server recomputes fingerprint) */
  requestedOptionValues?: Record<string, string> | null;
  dimensionKeys?: string[];
  notifyOnRestock?: boolean;
};

/**
 * POST /api/wishlist — add/remove variant row or option-snapshot row
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getAppUserId(supabase, user.id);
  if (!userId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wishlistItemId =
    typeof body.wishlistItemId === "string" && body.wishlistItemId.trim()
      ? body.wishlistItemId.trim()
      : null;

  if (body.inWishlist === false && wishlistItemId) {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", wishlistItemId)
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const { data: productOk } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!productOk) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const variantId =
    typeof body.productVariantId === "string" && body.productVariantId.trim()
      ? body.productVariantId.trim()
      : null;

  if (variantId) {
    const { data: vrow } = await supabase
      .from("product_variants")
      .select("id, product_id")
      .eq("id", variantId)
      .maybeSingle();
    if (!vrow || vrow.product_id !== productId) {
      return NextResponse.json({ error: "Variant not found for this product" }, { status: 404 });
    }

    if (body.inWishlist === false) {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_variant_id", variantId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const sellable = await sellableForVariant(supabase, variantId);
    const notify =
      sellable < 1 && body.notifyOnRestock === true ? true : false;

    const { error } = await supabase.from("wishlist_items").upsert(
      {
        user_id: userId,
        product_id: productId,
        product_variant_id: variantId,
        requested_option_values: null,
        option_request_fingerprint: null,
        notify_on_restock: notify,
      },
      { onConflict: "user_id,product_variant_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, notifyOnRestock: notify });
  }

  /* Option snapshot (no variant row) */
  const keys = Array.isArray(body.dimensionKeys) ? body.dimensionKeys : [];
  const reqVals =
    body.requestedOptionValues && typeof body.requestedOptionValues === "object"
      ? (body.requestedOptionValues as Record<string, string>)
      : null;
  if (!reqVals || keys.length === 0) {
    return NextResponse.json(
      { error: "dimensionKeys and requestedOptionValues required when productVariantId is omitted" },
      { status: 400 },
    );
  }

  const fingerprint = serverOptionFingerprint(keys, reqVals);

  if (body.inWishlist === false) {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("option_request_fingerprint", fingerprint)
      .is("product_variant_id", null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const notify = body.notifyOnRestock !== false;

  const { data: optExisting } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("option_request_fingerprint", fingerprint)
    .is("product_variant_id", null)
    .maybeSingle();

  if (optExisting) {
    const { error: upErr } = await supabase
      .from("wishlist_items")
      .update({
        requested_option_values: reqVals,
        notify_on_restock: notify,
      })
      .eq("id", (optExisting as { id: string }).id);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, notifyOnRestock: notify, optionFingerprint: fingerprint });
  }

  const { error: insErr } = await supabase.from("wishlist_items").insert({
    user_id: userId,
    product_id: productId,
    product_variant_id: null,
    requested_option_values: reqVals,
    option_request_fingerprint: fingerprint,
    notify_on_restock: notify,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, notifyOnRestock: notify, optionFingerprint: fingerprint });
}
