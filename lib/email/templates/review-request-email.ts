import { escapeHtml } from "@/lib/email/html";

const BG_PAGE = "#f4f4f5";
const BG_CARD = "#ffffff";
const TEXT_PRIMARY = "#18181b";
const TEXT_MUTED = "#71717a";
const TEXT_FAINT = "#a1a1aa";
const BORDER = "#e4e4e7";
const ACCENT = "#0a0a0a";

const FONT =
  "Montserrat,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export type ReviewRequestProductLine = {
  name: string;
  reviewUrl: string;
};

export type ReviewRequestEmailParams = {
  storeName: string;
  customerName: string;
  orderNumber: string;
  products: ReviewRequestProductLine[];
  allReviewsUrl: string;
};

function buildProductRows(products: ReviewRequestProductLine[]): string {
  return products
    .map((p) => {
      const name = escapeHtml(p.name);
      const url = escapeHtml(p.reviewUrl);
      return `<tr>
        <td style="padding:14px 16px;border-top:1px solid ${BORDER};font-size:14px;line-height:1.45;color:${TEXT_PRIMARY};font-family:${FONT};vertical-align:middle;">
          ${name}
        </td>
        <td align="right" style="padding:14px 16px;border-top:1px solid ${BORDER};font-family:${FONT};vertical-align:middle;white-space:nowrap;">
          <a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:9999px;font-size:13px;font-weight:600;">Leave a review</a>
        </td>
      </tr>`;
    })
    .join("");
}

export function buildReviewRequestEmailText(params: ReviewRequestEmailParams): string {
  const { storeName, customerName, orderNumber, products, allReviewsUrl } = params;
  const productLines = products
    .map((p) => `  • ${p.name}\n    ${p.reviewUrl}`)
    .join("\n");

  return [
    storeName,
    "",
    `How was your order? — ${orderNumber}`,
    "",
    `Hi ${customerName},`,
    "",
    "We hope you're enjoying your recent order. Your feedback helps other shoppers in Pakistan and helps us improve.",
    "",
    "Review your items:",
    productLines,
    "",
    `See all customer reviews: ${allReviewsUrl}`,
    "",
    "Thank you for shopping with us.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReviewRequestEmailHtml(params: ReviewRequestEmailParams): string {
  const { storeName, customerName, orderNumber, products, allReviewsUrl } = params;
  const year = new Date().getFullYear();
  const safeStore = escapeHtml(storeName);
  const safeName = escapeHtml(customerName);
  const safeOrder = escapeHtml(orderNumber);
  const safeAllReviews = escapeHtml(allReviewsUrl);
  const productRows = buildProductRows(products);
  const pre = escapeHtml(
    `How was order ${orderNumber}? Share a quick review — it only takes a minute.`,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>How was your order? — ${safeOrder}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${pre}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="background:${BG_CARD};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="height:4px;background:${ACCENT};font-size:0;">&nbsp;</td></tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:28px 28px 0;">
                    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${TEXT_FAINT};font-family:${FONT};">${safeStore}</p>
                    <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">How was your order?</h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:${TEXT_MUTED};font-family:${FONT};">
                      Hi ${safeName}, we hope you're enjoying your order <strong style="color:${TEXT_PRIMARY};">${safeOrder}</strong>.
                      A quick star rating and photo review helps other shoppers — thank you!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;border-collapse:separate;">
                      ${productRows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 28px;">
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${TEXT_MUTED};font-family:${FONT};">
                      You may need to sign in to submit a review. It only takes a minute.
                    </p>
                    <p style="margin:0;font-family:${FONT};">
                      <a href="${safeAllReviews}" style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">Browse customer reviews →</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.5;color:${TEXT_FAINT};font-family:${FONT};">
              © ${year} ${safeStore}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
