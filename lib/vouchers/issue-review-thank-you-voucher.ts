import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReviewThankYouVoucherEmail } from "@/lib/email/send-review-thank-you-voucher-email";
import { getPublicSiteUrl } from "@/lib/site-url";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VOUCHER_VALID_DAYS = 30;
const DISCOUNT_PERCENT = 5;

function randomVoucherCode(): string {
  let suffix = "";
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 8; i++) {
    suffix += CODE_CHARS[buf[i]! % CODE_CHARS.length];
  }
  return `THANKS5-${suffix}`;
}

function isValidEmail(email: string): boolean {
  const e = email.trim();
  return e.length > 3 && e.includes("@") && !/\s/.test(e);
}

function formatValidUntil(date: Date): string {
  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type ReviewRow = {
  id: string;
  status: string;
  user_id: string | null;
  attributed_display_name: string | null;
  attributed_display_email: string | null;
  thank_you_voucher_sent_at: string | null;
  product_id: string;
};

export type IssueReviewThankYouVoucherResult =
  | { ok: true; sent: true; code: string }
  | { ok: true; sent: false; reason: string }
  | { ok: false; error: string };

async function resolveRecipientEmail(
  admin: SupabaseClient,
  review: ReviewRow,
): Promise<{ email: string; customerName: string } | null> {
  if (review.user_id) {
    const { data: userRow } = await admin
      .from("users")
      .select("auth_id, first_name, last_name")
      .eq("id", review.user_id)
      .maybeSingle();

    const authId = userRow?.auth_id;
    if (authId) {
      const { data: authUser, error } = await admin.auth.admin.getUserById(authId);
      const email = authUser?.user?.email?.trim() ?? "";
      if (!error && isValidEmail(email)) {
        const name =
          [userRow?.first_name, userRow?.last_name].filter(Boolean).join(" ").trim() ||
          review.attributed_display_name?.trim() ||
          "there";
        return { email, customerName: name };
      }
    }
  }

  const attributedEmail = review.attributed_display_email?.trim() ?? "";
  if (isValidEmail(attributedEmail)) {
    return {
      email: attributedEmail,
      customerName: review.attributed_display_name?.trim() || "there",
    };
  }

  return null;
}

export async function issueReviewThankYouVoucher(
  admin: SupabaseClient,
  reviewId: string,
): Promise<IssueReviewThankYouVoucherResult> {
  const { data: reviewRaw, error: reviewErr } = await admin
    .from("reviews")
    .select(
      "id, status, user_id, attributed_display_name, attributed_display_email, thank_you_voucher_sent_at, product_id",
    )
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewErr) {
    return { ok: false, error: reviewErr.message };
  }

  const review = reviewRaw as ReviewRow | null;
  if (!review) {
    return { ok: false, error: "Review not found" };
  }

  if (review.status !== "approved") {
    return { ok: true, sent: false, reason: "Review is not approved" };
  }

  if (review.thank_you_voucher_sent_at) {
    return { ok: true, sent: false, reason: "Voucher already sent" };
  }

  const recipient = await resolveRecipientEmail(admin, review);
  if (!recipient) {
    return { ok: true, sent: false, reason: "No email on file for reviewer" };
  }

  const { data: productRow } = await admin
    .from("products")
    .select("name")
    .eq("id", review.product_id)
    .maybeSingle();

  const productName =
    typeof productRow?.name === "string" && productRow.name.trim()
      ? productRow.name.trim()
      : "your product";

  const validFrom = new Date();
  const validUntil = new Date(validFrom);
  validUntil.setDate(validUntil.getDate() + VOUCHER_VALID_DAYS);

  const batchName = `Review thank-you ${review.id.slice(0, 8)}`;

  const { data: batchRow, error: batchErr } = await admin
    .from("voucher_batches")
    .insert({
      name: batchName,
      batch_kind: "multi",
      status: "active",
      product_scope: "all",
      product_ids: [],
      min_order_amount: 0,
      campaign_purpose: "review_thank_you",
      attribution_source: "review_approval",
    })
    .select("id")
    .single();

  if (batchErr || !batchRow) {
    return { ok: false, error: batchErr?.message ?? "Could not create voucher batch" };
  }

  const code = randomVoucherCode();
  const { error: instErr } = await admin.from("voucher_instances").insert({
    batch_id: (batchRow as { id: string }).id,
    code,
    assigned_public_user_id: review.user_id,
    override_discount_type: "percentage",
    override_voucher_amount: DISCOUNT_PERCENT,
    override_min_order_amount: 0,
    override_valid_from: validFrom.toISOString(),
    override_valid_until: validUntil.toISOString(),
    override_product_scope: "all",
    override_product_ids: [],
  });

  if (instErr) {
    return { ok: false, error: instErr.message };
  }

  const site = getPublicSiteUrl().replace(/\/$/, "");
  const emailResult = await sendReviewThankYouVoucherEmail({
    to: recipient.email,
    customerName: recipient.customerName,
    productName,
    voucherCode: code,
    validUntilLabel: formatValidUntil(validUntil),
    shopUrl: site,
  });

  if (!emailResult.sent) {
    return { ok: false, error: emailResult.error ?? "Email send failed" };
  }

  const { error: markErr } = await admin
    .from("reviews")
    .update({ thank_you_voucher_sent_at: new Date().toISOString() })
    .eq("id", reviewId)
    .is("thank_you_voucher_sent_at", null);

  if (markErr) {
    return { ok: false, error: markErr.message };
  }

  return { ok: true, sent: true, code };
}
