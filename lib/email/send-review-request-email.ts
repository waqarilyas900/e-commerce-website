import {
  buildReviewRequestEmailHtml,
  buildReviewRequestEmailText,
  type ReviewRequestProductLine,
} from "@/lib/email/templates/review-request-email";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type SendReviewRequestEmailInput = {
  to: string;
  customerName: string;
  orderNumber: string;
  products: ReviewRequestProductLine[];
  allReviewsUrl: string;
};

const STORE_NAME = "SimpleCartStore";

export async function sendReviewRequestEmail(
  input: SendReviewRequestEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  if (!input.products.length) {
    return { sent: false, error: "No reviewable products" };
  }

  const templateParams = {
    storeName: STORE_NAME,
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    products: input.products,
    allReviewsUrl: input.allReviewsUrl,
  };

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `${STORE_NAME} — How was your order? (${input.orderNumber})`,
    html: buildReviewRequestEmailHtml(templateParams),
    text: buildReviewRequestEmailText(templateParams),
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
