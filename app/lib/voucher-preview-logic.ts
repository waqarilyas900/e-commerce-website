/**
 * Pure parsing + RPC result shaping for POST /api/vouchers/preview.
 * Kept separate from the route so tests do not need Next.js or Supabase.
 */

export type VoucherPreviewBody = {
  code: string;
  cart_subtotal: number;
  product_ids: string[];
};

export type VoucherPreviewResult =
  | {
      ok: true;
      discount_cents: number;
      discount_type: string;
      kind: string;
      batch_id: string;
    }
  | { ok: false; error: string; error_code?: string };

export type ParsePreviewBodyResult =
  | { ok: true; value: { code: string; cart_subtotal: number; product_ids: string[] } }
  | { ok: false; status: 400; body: Extract<VoucherPreviewResult, { ok: false }> };

export function parseVoucherPreviewRequestBody(body: unknown): ParsePreviewBodyResult {
  const b = body as Partial<VoucherPreviewBody>;
  const code = typeof b.code === "string" ? b.code.trim() : "";
  const cartSub =
    typeof b.cart_subtotal === "number" && Number.isFinite(b.cart_subtotal) ? b.cart_subtotal : NaN;
  const productIds = Array.isArray(b.product_ids)
    ? b.product_ids.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  if (!code) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Enter a voucher code.", error_code: "code_required" },
    };
  }
  if (!Number.isFinite(cartSub) || cartSub < 0) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Invalid cart subtotal.", error_code: "validation" },
    };
  }

  return {
    ok: true,
    value: { code, cart_subtotal: cartSub, product_ids: productIds },
  };
}

export type InterpretRpcResult =
  | { status: 200; body: Extract<VoucherPreviewResult, { ok: true }> }
  | { status: 400 | 502; body: Extract<VoucherPreviewResult, { ok: false }> };

export function interpretPreviewVoucherRpcData(data: unknown): InterpretRpcResult {
  const row = data as Record<string, unknown> | null;
  if (!row || typeof row !== "object") {
    return {
      status: 502,
      body: { ok: false, error: "Unexpected response", error_code: "unexpected" },
    };
  }

  if (row.ok === false) {
    return {
      status: 400,
      body: {
        ok: false,
        error: String(row.error ?? "Invalid code"),
        error_code: typeof row.error_code === "string" ? row.error_code : undefined,
      },
    };
  }

  if (row.ok !== true) {
    return {
      status: 502,
      body: { ok: false, error: "Unexpected response", error_code: "unexpected" },
    };
  }

  const discountCents = Number(row.discount_cents);
  if (!Number.isFinite(discountCents) || discountCents <= 0) {
    return {
      status: 400,
      body: { ok: false, error: "No discount applicable", error_code: "no_discount" },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      discount_cents: Math.round(discountCents),
      discount_type: String(row.discount_type ?? ""),
      kind: String(row.kind ?? ""),
      batch_id: String(row.batch_id ?? ""),
    },
  };
}
