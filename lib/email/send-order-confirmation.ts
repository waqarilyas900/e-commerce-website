import { escapeHtml } from "@/lib/email/html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type OrderLineSummary = {
  name: string;
  quantity: number;
  lineTotalLabel: string;
};

export type SendOrderConfirmationInput = {
  to: string;
  orderNumber: string;
  totalLabel: string;
  customerName: string;
  lines: OrderLineSummary[];
  shippingSummary: string;
};

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  const linesHtml = input.lines
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(l.name)}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(l.lineTotalLabel)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:560px">
  <p style="font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#737373;margin:0 0 8px">SimpleCartStore</p>
  <h1 style="font-size:20px">Order confirmed</h1>
  <p>Hi ${escapeHtml(input.customerName)},</p>
  <p>Thanks for your order <strong>${escapeHtml(input.orderNumber)}</strong>.</p>
  <p style="font-size:18px;font-weight:600">Total: ${escapeHtml(input.totalLabel)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
    <thead><tr>
      <th align="left" style="padding:8px 0;border-bottom:2px solid #ddd">Item</th>
      <th style="padding:8px 0;border-bottom:2px solid #ddd">Qty</th>
      <th align="right" style="padding:8px 0;border-bottom:2px solid #ddd">Line</th>
    </tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <p style="margin-top:20px;font-size:14px"><strong>Ship to</strong><br/>${escapeHtml(input.shippingSummary).replace(/\n/g, "<br/>")}</p>
  <p style="margin-top:24px;font-size:12px;color:#737373">If you did not place this order, contact support.</p>
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `SimpleCartStore — Order confirmed (${input.orderNumber})`,
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
