import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  interpretPreviewVoucherRpcData,
  parseVoucherPreviewRequestBody,
  type VoucherPreviewBody,
  type VoucherPreviewResult,
} from "@/app/lib/voucher-preview-logic";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export type { VoucherPreviewBody, VoucherPreviewResult };

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`voucher-preview:${ip}`, 40, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs, "Too many voucher attempts. Try again in a few minutes.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" } satisfies VoucherPreviewResult, {
      status: 400,
    });
  }

  const parsed = parseVoucherPreviewRequestBody(body);
  if (!parsed.ok) {
    return NextResponse.json(parsed.body, { status: parsed.status });
  }

  const { code, cart_subtotal, product_ids } = parsed.value;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_voucher", {
    p_code: code,
    p_cart_subtotal: cart_subtotal,
    p_cart_product_ids: product_ids,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Could not verify voucher", error_code: "rpc_error" } satisfies VoucherPreviewResult,
      { status: 400 },
    );
  }

  const out = interpretPreviewVoucherRpcData(data);
  return NextResponse.json(out.body as VoucherPreviewResult, { status: out.status });
}
