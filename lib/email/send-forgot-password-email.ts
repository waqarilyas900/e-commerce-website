import { getPublicStoreName } from "@/app/lib/store-name";
import {
  buildForgotPasswordEmailHtml,
  buildForgotPasswordEmailText,
} from "@/lib/email/templates/forgot-password-email";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export async function sendForgotPasswordEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY)" };
  }

  const storeName = getPublicStoreName();
  const params = {
    storeName,
    resetUrl: input.resetUrl,
    recipientEmail: input.to,
  };
  const html = buildForgotPasswordEmailHtml(params);
  const text = buildForgotPasswordEmailText(params);

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `${storeName} — reset your password`,
    html,
    text,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
