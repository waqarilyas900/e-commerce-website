import { escapeHtml } from "@/lib/email/html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type SendRestockEmailInput = {
  to: string;
  productName: string;
  variantLabel: string;
  productUrl: string;
};

export async function sendRestockEmail(
  input: SendRestockEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:560px">
  <h1 style="font-size:20px">Back in stock</h1>
  <p>Good news — <strong>${escapeHtml(input.productName)}</strong> (${escapeHtml(input.variantLabel)}) is available again.</p>
  <p style="margin-top:20px">
    <a href="${escapeHtml(input.productUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-size:14px;font-weight:600">View product</a>
  </p>
  <p style="margin-top:24px;font-size:12px;color:#737373">You received this because you asked to be notified when this option was restocked.</p>
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Back in stock — ${input.productName}`,
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
