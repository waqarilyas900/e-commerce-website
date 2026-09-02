import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPriceDropEmail } from "@/lib/email/send-price-drop-email";
import { getPublicSiteUrl } from "@/lib/site-url";

export const PRICE_DROP_BATCH = 25;

export type PriceDropCronResult = {
  ok: true;
  processed: number;
  sent: number;
  failed: number;
  failures?: Array<{ queueId: string; email: string; error: string }>;
};

type QueueRow = {
  id: string;
  user_email: string;
  wishlist_item_id: string;
  product_variant_id: string;
  old_price: number;
  new_price: number;
};

function variantLabelFromOptionValues(ov: unknown): string {
  if (!ov || typeof ov !== "object" || Array.isArray(ov)) return "Selected option";
  const entries = Object.entries(ov as Record<string, string>);
  if (entries.length === 0) return "Selected option";
  return entries.map(([k, val]) => `${k}: ${val}`).join(" · ");
}

export async function processPriceDropNotifications(): Promise<PriceDropCronResult> {
  const admin = createServiceRoleClient();
  const site = getPublicSiteUrl().replace(/\/$/, "");

  const { data: rows, error: qErr } = await admin
    .from("price_drop_notification_queue")
    .select("id, user_email, wishlist_item_id, product_variant_id, old_price, new_price")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(PRICE_DROP_BATCH);

  if (qErr) {
    throw new Error(qErr.message);
  }

  const queue = (rows ?? []) as QueueRow[];
  if (queue.length === 0) {
    return { ok: true, processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const failures: PriceDropCronResult["failures"] = [];

  for (const row of queue) {
    const { data: vrow } = await admin
      .from("product_variants")
      .select("option_values, price, products(name, slug)")
      .eq("id", row.product_variant_id)
      .maybeSingle();

    const prod = vrow?.products as unknown;
    const productName =
      prod && typeof prod === "object" && !Array.isArray(prod) && "name" in prod
        ? String((prod as { name: string }).name)
        : "Product";

    const slug =
      prod && typeof prod === "object" && !Array.isArray(prod) && "slug" in prod
        ? String((prod as { slug: string }).slug)
        : "";

    const variantLabel = variantLabelFromOptionValues(vrow?.option_values);
    const newPrice = Number(vrow?.price ?? row.new_price);
    const productUrl = slug ? `${site}/products/${encodeURIComponent(slug)}` : site;

    const result = await sendPriceDropEmail({
      to: row.user_email,
      productName,
      variantLabel,
      oldPrice: Number(row.old_price),
      newPrice,
      productUrl,
    });

    const now = new Date().toISOString();

    if (result.sent) {
      await admin
        .from("price_drop_notification_queue")
        .update({ processed_at: now })
        .eq("id", row.id);

      await admin
        .from("wishlist_items")
        .update({ price_drop_last_notified_price: newPrice })
        .eq("id", row.wishlist_item_id);

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

  return {
    ok: true,
    processed: queue.length,
    sent,
    failed,
    ...(failures.length > 0 ? { failures } : {}),
  };
}
