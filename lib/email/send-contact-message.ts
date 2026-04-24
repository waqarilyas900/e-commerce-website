import { escapeHtml } from "@/lib/email/html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type SendContactMessageInput = {
  fromName: string;
  fromEmail: string;
  message: string;
  /** Public Supabase Storage URLs for optional contact screenshots. */
  imageUrls?: string[];
};

/** Inbox for contact form — must be a real address you check. */
function getContactInbox(): string | null {
  return process.env.RESEND_CONTACT_TO?.trim() || null;
}

export async function sendContactInquiryEmail(
  input: SendContactMessageInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  const to = getContactInbox();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY)" };
  }
  if (!to) {
    return {
      sent: false,
      error:
        "Set RESEND_CONTACT_TO to your inbox email to receive contact form messages.",
    };
  }

  const urls = (input.imageUrls ?? []).filter(Boolean);
  const attachmentsBlock =
    urls.length > 0
      ? `<div style="margin-top:20px">
  <h2 style="font-size:15px;margin:0 0 8px">Attached images (${urls.length})</h2>
  <ul style="margin:0;padding-left:18px">
    ${urls
      .map(
        (u) =>
          `<li style="margin:6px 0"><a href="${escapeHtml(u)}" style="color:#2563eb;word-break:break-all">${escapeHtml(u)}</a></li>`,
      )
      .join("")}
  </ul>
  <p style="font-size:12px;color:#525252;margin-top:10px">Open each link to view the screenshot the customer attached.</p>
</div>`
      : "";

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717">
  <h1 style="font-size:18px">Contact form</h1>
  <p><strong>From:</strong> ${escapeHtml(input.fromName)} &lt;${escapeHtml(input.fromEmail)}&gt;</p>
  <pre style="white-space:pre-wrap;font-size:14px;background:#f5f5f5;padding:16px;border-radius:8px">${escapeHtml(input.message)}</pre>
  ${attachmentsBlock}
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: input.fromEmail,
    subject:
      urls.length > 0 ? `Contact: ${input.fromName} (${urls.length} image${urls.length > 1 ? "s" : ""})` : `Contact: ${input.fromName}`,
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
