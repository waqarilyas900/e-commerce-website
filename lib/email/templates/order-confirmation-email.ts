import { escapeHtml } from "@/lib/email/html";

export type OrderLineSummary = {
  name: string;
  quantity: number;
  lineTotalLabel: string;
};

const BG_PAGE = "#f4f4f5";
const BG_CARD = "#ffffff";
const BG_ROW_ALT = "#fafafa";
const BG_MUTED_BOX = "#fafafa";
const TEXT_PRIMARY = "#18181b";
const TEXT_MUTED = "#71717a";
const TEXT_FAINT = "#a1a1aa";
const BORDER = "#e4e4e7";
const ACCENT = "#0a0a0a";
const ACCENT_SOFT = "#18181b";

const FONT =
  "Montserrat,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export type OrderConfirmationEmailParams = {
  storeName: string;
  orderNumber: string;
  totalLabel: string;
  customerName: string;
  lines: OrderLineSummary[];
  shippingSummary: string;
  placedAtLabel?: string;
};

function buildPreheader(orderNumber: string, totalLabel: string): string {
  return `Your order ${orderNumber} is confirmed. Total ${totalLabel}. We'll notify you when it ships.`;
}

function buildLineRows(lines: OrderLineSummary[]): string {
  return lines
    .map((line, index) => {
      const bg = index % 2 === 0 ? BG_CARD : BG_ROW_ALT;
      const name = escapeHtml(line.name);
      const total = escapeHtml(line.lineTotalLabel);
      return `<tr style="background:${bg};">
        <td style="padding:14px 16px;border-top:1px solid ${BORDER};font-size:14px;line-height:1.45;color:${TEXT_PRIMARY};font-family:${FONT};vertical-align:top;">
          ${name}
        </td>
        <td align="center" style="padding:14px 12px;border-top:1px solid ${BORDER};font-size:14px;color:${TEXT_MUTED};font-family:${FONT};vertical-align:top;width:56px;">
          ${line.quantity}
        </td>
        <td align="right" style="padding:14px 16px;border-top:1px solid ${BORDER};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};font-family:${FONT};vertical-align:top;white-space:nowrap;">
          ${total}
        </td>
      </tr>`;
    })
    .join("");
}

export function buildOrderConfirmationEmailText(params: OrderConfirmationEmailParams): string {
  const {
    storeName,
    orderNumber,
    totalLabel,
    customerName,
    lines,
    shippingSummary,
    placedAtLabel,
  } = params;

  const itemLines = lines
    .map((l) => `  • ${l.name}  ×${l.quantity}  —  ${l.lineTotalLabel}`)
    .join("\n");

  return [
    storeName,
    "",
    `Order confirmed — ${orderNumber}`,
    placedAtLabel ? `Placed on ${placedAtLabel}` : "",
    "",
    `Hi ${customerName},`,
    "",
    "Thank you for shopping with us. We've received your order and started processing it.",
    "",
    "Items",
    itemLines,
    "",
    `Order total: ${totalLabel}`,
    "",
    "Ship to",
    shippingSummary,
    "",
    "If you did not place this order, please contact our support team right away.",
    "",
    `— ${storeName}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOrderConfirmationEmailHtml(params: OrderConfirmationEmailParams): string {
  const {
    storeName,
    orderNumber,
    totalLabel,
    customerName,
    lines,
    shippingSummary,
    placedAtLabel,
  } = params;

  const year = new Date().getFullYear();
  const safeStore = escapeHtml(storeName);
  const safeOrder = escapeHtml(orderNumber);
  const safeTotal = escapeHtml(totalLabel);
  const safeName = escapeHtml(customerName);
  const safeShipping = escapeHtml(shippingSummary).replace(/\n/g, "<br />");
  const pre = escapeHtml(buildPreheader(orderNumber, totalLabel));
  const lineRows = buildLineRows(lines);

  const placedMeta = placedAtLabel
    ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${TEXT_MUTED};font-family:${FONT};">
        Placed on ${escapeHtml(placedAtLabel)}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Order confirmed — ${safeOrder}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${pre}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="background:${BG_CARD};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:4px;background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:28px 28px 0;">
                    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${TEXT_FAINT};font-family:${FONT};">
                      ${safeStore}
                    </p>
                    <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${TEXT_PRIMARY};font-family:${FONT};">
                      Order confirmed
                    </h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:${TEXT_MUTED};font-family:${FONT};">
                      Hi ${safeName}, thanks for your order. We've received it and started processing.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 28px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_MUTED_BOX};border:1px solid ${BORDER};border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_FAINT};font-family:${FONT};">
                            Order number
                          </p>
                          <p style="margin:6px 0 0;font-size:18px;line-height:1.3;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
                            ${safeOrder}
                          </p>
                          ${placedMeta}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 0;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_FAINT};font-family:${FONT};">
                      Order summary
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;border-collapse:separate;">
                      <tr style="background:${ACCENT};">
                        <th align="left" style="padding:12px 16px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;font-family:${FONT};">
                          Item
                        </th>
                        <th align="center" style="padding:12px 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;font-family:${FONT};width:56px;">
                          Qty
                        </th>
                        <th align="right" style="padding:12px 16px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;font-family:${FONT};">
                          Total
                        </th>
                      </tr>
                      ${lineRows}
                      <tr style="background:${ACCENT_SOFT};">
                        <td colspan="2" style="padding:16px;font-size:14px;font-weight:600;color:#ffffff;font-family:${FONT};">
                          Order total
                        </td>
                        <td align="right" style="padding:16px;font-size:18px;font-weight:700;color:#ffffff;font-family:${FONT};white-space:nowrap;">
                          ${safeTotal}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 0;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_FAINT};font-family:${FONT};">
                      Shipping address
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_MUTED_BOX};border:1px solid ${BORDER};border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${TEXT_PRIMARY};font-family:${FONT};">
                          ${safeShipping}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 28px;">
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${TEXT_MUTED};font-family:${FONT};">
                      We'll email you again when your order ships. If you didn't place this order, please contact our support team immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 8px 0;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:${TEXT_FAINT};font-family:${FONT};">
                © ${year} ${safeStore}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
