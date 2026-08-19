import {
  buildOrderConfirmationEmailHtml,
  buildOrderConfirmationEmailText,
  type OrderLineSummary,
} from "@/lib/email/templates/order-confirmation-email";
import { getResend, getResendFrom } from "@/lib/email/resend-client";

export type { OrderLineSummary };

export type SendOrderConfirmationInput = {
  to: string;
  orderNumber: string;
  totalLabel: string;
  customerName: string;
  lines: OrderLineSummary[];
  shippingSummary: string;
};

const STORE_NAME = "SimpleCartStore";

function formatPlacedAtLabel(date = new Date()): string {
  return date.toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return { sent: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" };
  }

  const templateParams = {
    storeName: STORE_NAME,
    orderNumber: input.orderNumber,
    totalLabel: input.totalLabel,
    customerName: input.customerName,
    lines: input.lines,
    shippingSummary: input.shippingSummary,
    placedAtLabel: formatPlacedAtLabel(),
  };

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `${STORE_NAME} — Order confirmed (${input.orderNumber})`,
    html: buildOrderConfirmationEmailHtml(templateParams),
    text: buildOrderConfirmationEmailText(templateParams),
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
