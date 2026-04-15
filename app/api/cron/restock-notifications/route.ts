import { NextResponse } from "next/server";
import { sendRestockEmail } from "@/lib/email/send-restock-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPublicSiteUrl } from "@/lib/site-url";

type QueueRow = {
  id: string;
  user_email: string;
  wishlist_item_id: string;
  product_variant_id: string;
};

const BATCH = 25;

/**
 * GET /api/cron/restock-notifications
 * Authorization: Bearer CRON_SECRET (or x-cron-secret header)
 * Processes pending rows in restock_notification_queue and sends Resend emails.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const token =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : headerSecret?.trim();
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role client failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }

  const site = getPublicSiteUrl();

  const { data: rows, error: qErr } = await admin
    .from("restock_notification_queue")
    .select("id, user_email, wishlist_item_id, product_variant_id")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (qErr || !rows?.length) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      error: qErr?.message,
    });
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{ queueId: string; email: string; error?: string }> = [];

  for (const row of rows as QueueRow[]) {
    const { data: vrow } = await admin
      .from("product_variants")
      .select("option_values, products(name, slug)")
      .eq("id", row.product_variant_id)
      .maybeSingle();

    const prod = vrow?.products;
    const productName =
      prod &&
      typeof prod === "object" &&
      !Array.isArray(prod) &&
      "name" in prod
        ? String((prod as { name: string }).name)
        : "Product";

    const slug =
      prod &&
      typeof prod === "object" &&
      !Array.isArray(prod) &&
      "slug" in prod
        ? String((prod as { slug: string }).slug)
        : "";

    const ov =
      vrow && typeof vrow.option_values === "object" && vrow.option_values !== null
        ? (vrow.option_values as Record<string, string>)
        : {};
    const variantLabel =
      Object.keys(ov).length > 0
        ? Object.entries(ov)
            .map(([k, val]) => `${k}: ${val}`)
            .join(" · ")
        : "Selected option";

    const productUrl = slug ? `${site}/products/${encodeURIComponent(slug)}` : site;

    const result = await sendRestockEmail({
      to: row.user_email,
      productName,
      variantLabel,
      productUrl,
    });

    const now = new Date().toISOString();

    if (result.sent) {
      await admin.from("restock_notification_queue").update({ processed_at: now }).eq("id", row.id);

      await admin.from("wishlist_items").delete().eq("id", row.wishlist_item_id);

      sent += 1;
    } else {
      failed += 1;
      failures.push({
        queueId: row.id,
        email: row.user_email,
        error: result.error ?? "send failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    sent,
    failed,
    ...(failures.length > 0 ? { failures } : {}),
  });
}
