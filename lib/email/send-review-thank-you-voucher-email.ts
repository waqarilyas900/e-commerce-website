import { escapeHtml } from "@/lib/email/html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type SendReviewThankYouVoucherEmailInput = {
  to: string;
  customerName: string;
  productName: string;
  voucherCode: string;
  validUntilLabel: string;
  shopUrl: string;
};

export async function sendReviewThankYouVoucherEmail(
  input: SendReviewThankYouVoucherEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:560px">
  <h1 style="font-size:20px">Thank you for your review</h1>
  <p>Hi ${escapeHtml(input.customerName)},</p>
  <p>Thanks for sharing your feedback on <strong>${escapeHtml(input.productName)}</strong>. Here is a one-time <strong>5% off</strong> code for your next order:</p>
  <p style="margin:20px 0;padding:14px 18px;background:#f5f5f5;border-radius:8px;font-size:18px;font-weight:700;letter-spacing:0.08em;text-align:center">${escapeHtml(input.voucherCode)}</p>
  <p style="font-size:14px;color:#404040">Valid until ${escapeHtml(input.validUntilLabel)}. Enter the code at checkout.</p>
  <p style="margin-top:20px">
    <a href="${escapeHtml(input.shopUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-size:14px;font-weight:600">Shop now</a>
  </p>
  <p style="margin-top:24px;font-size:12px;color:#737373">This code can be used once. It was issued because your review was approved.</p>
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: "Thank you — 5% off your next order",
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
