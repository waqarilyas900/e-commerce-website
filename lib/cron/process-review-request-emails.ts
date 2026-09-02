import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendReviewRequestEmail } from "@/lib/email/send-review-request-email";
import type { ReviewRequestProductLine } from "@/lib/email/templates/review-request-email";
import { getPublicSiteUrl } from "@/lib/site-url";

/** Send review requests when an order is at least this many days old. */
export const REVIEW_REQUEST_MIN_DAYS = 4;

export const REVIEW_REQUEST_BATCH = 25;

export type ReviewRequestCronResult = {
  ok: true;
  processed: number;
  sent: number;
  failed: number;
  failures?: Array<{ orderId: string; email: string; error: string }>;
};

type PendingOrder = {
  id: string;
  order_number: string;
  email: string;
  first_name: string;
  last_name: string;
};

function isValidEmail(email: string): boolean {
  const e = email.trim();
  return e.length > 3 && e.includes("@") && !/\s/.test(e);
}

function customerDisplayName(first: string, last: string): string {
  const name = `${first} ${last}`.trim();
  return name || "there";
}

function reviewUrlForSlug(site: string, slug: string): string {
  return `${site}/products/${encodeURIComponent(slug)}?openReview=1`;
}

async function loadReviewProducts(
  admin: ReturnType<typeof createServiceRoleClient>,
  orderId: string,
  site: string,
): Promise<ReviewRequestProductLine[]> {
  const { data, error } = await admin
    .from("order_items")
    .select("product_name_snapshot, product_slug_snapshot")
    .eq("order_id", orderId);

  if (error || !data?.length) return [];

  const bySlug = new Map<string, ReviewRequestProductLine>();
  for (const row of data) {
    const slug = String(row.product_slug_snapshot ?? "").trim();
    if (!slug) continue;
    const name =
      typeof row.product_name_snapshot === "string" && row.product_name_snapshot.trim()
        ? row.product_name_snapshot.trim()
        : "Product";
    if (bySlug.has(slug)) continue;
    bySlug.set(slug, {
      name,
      reviewUrl: reviewUrlForSlug(site, slug),
    });
  }

  return [...bySlug.values()];
}

export async function processReviewRequestEmails(): Promise<ReviewRequestCronResult> {
  const admin = createServiceRoleClient();
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const allReviewsUrl = `${site}/customer-reviews`;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REVIEW_REQUEST_MIN_DAYS);
  const cutoffIso = cutoff.toISOString();

  const { data: orders, error: qErr } = await admin
    .from("orders")
    .select("id, order_number, email, first_name, last_name")
    .is("review_request_sent_at", null)
    .not("email", "is", null)
    .in("status", ["pending", "confirmed", "paid", "processing", "shipped", "delivered"])
    .lte("created_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(REVIEW_REQUEST_BATCH);

  if (qErr) {
    throw new Error(qErr.message);
  }

  const rows = (orders ?? []) as PendingOrder[];
  if (rows.length === 0) {
    return { ok: true, processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const failures: ReviewRequestCronResult["failures"] = [];

  for (const order of rows) {
    const email = order.email?.trim() ?? "";
    if (!isValidEmail(email)) {
      await admin
        .from("orders")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", order.id);
      continue;
    }

    const products = await loadReviewProducts(admin, order.id, site);
    if (products.length === 0) {
      await admin
        .from("orders")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", order.id);
      continue;
    }

    const orderNumber = order.order_number?.trim() || order.id.slice(0, 8).toUpperCase();
    const result = await sendReviewRequestEmail({
      to: email,
      customerName: customerDisplayName(order.first_name ?? "", order.last_name ?? ""),
      orderNumber,
      products,
      allReviewsUrl,
    });

    if (result.sent) {
      await admin
        .from("orders")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", order.id);
      sent += 1;
    } else {
      failed += 1;
      failures.push({
        orderId: order.id,
        email,
        error: result.error ?? "send failed",
      });
    }
  }

  return {
    ok: true,
    processed: rows.length,
    sent,
    failed,
    ...(failures.length > 0 ? { failures } : {}),
  };
}
