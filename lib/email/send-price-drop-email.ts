import { escapeHtml } from "@/lib/email/html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";
import { formatPkr } from "@/app/lib/format-currency";

export type SendPriceDropEmailInput = {
  to: string;
  productName: string;
  variantLabel: string;
  oldPrice: number;
  newPrice: number;
  productUrl: string;
};

export async function sendPriceDropEmail(
  input: SendPriceDropEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  const savings = Math.max(0, input.oldPrice - input.newPrice);
  const savingsLine =
    savings > 0
      ? `<p style="margin:12px 0 0;font-size:14px;color:#404040">You save <strong>${escapeHtml(formatPkr(savings))}</strong> — was ${escapeHtml(formatPkr(input.oldPrice))}, now ${escapeHtml(formatPkr(input.newPrice))}.</p>`
      : "";

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:560px">
  <h1 style="font-size:20px">Price drop on your wishlist</h1>
  <p><strong>${escapeHtml(input.productName)}</strong> (${escapeHtml(input.variantLabel)}) is now lower in price.</p>
  ${savingsLine}
  <p style="margin-top:20px">
    <a href="${escapeHtml(input.productUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-size:14px;font-weight:600">View product</a>
  </p>
  <p style="margin-top:24px;font-size:12px;color:#737373">You received this because this item is on your wishlist.</p>
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Price drop — ${input.productName}`,
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
