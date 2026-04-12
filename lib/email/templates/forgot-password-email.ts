import { escapeHtml } from "@/lib/email/html";
import { PASSWORD_RESET_LINK_VALID_MINUTES } from "@/lib/auth/password-reset";

export type ForgotPasswordEmailParams = {
  storeName: string;
  resetUrl: string;
  recipientEmail: string;
};

const BG_PAGE = "#f4f4f5";
const BG_CARD = "#ffffff";
const TEXT_PRIMARY = "#18181b";
const TEXT_MUTED = "#71717a";
const TEXT_FAINT = "#a1a1aa";
const BORDER = "#e4e4e7";
const ACCENT = "#18181b";
const URL_BOX_BG = "#fafafa";

function safeHref(url: string): string {
  return escapeHtml(url);
}

/**
 * Inbox preview line (hidden in body; many clients show next to subject).
 */
function buildPreheader(minutes: number): string {
  return `Use the secure link to choose a new password. Expires in ${minutes} minutes — ignore if you didn’t request this.`;
}

/**
 * Plain-text body for clients that prefer it and for deliverability.
 */
export function buildForgotPasswordEmailText(params: ForgotPasswordEmailParams): string {
  const { storeName, resetUrl, recipientEmail } = params;
  const minutes = PASSWORD_RESET_LINK_VALID_MINUTES;
  const lines = [
    `${storeName}`,
    "",
    "Hi there,",
    "",
    "We received a request to reset the password for the account using this email address.",
    "",
    `Open this link to choose a new password (expires in ${minutes} minutes):`,
    resetUrl,
    "",
    "If you didn’t ask for this, you can ignore this email. Your password won’t change.",
    "",
    `This message was sent to ${recipientEmail}.`,
    "",
    `— ${storeName}`,
  ];
  return lines.join("\n");
}

/**
 * HTML for password reset — Resend-ready, table-based CTA for common mail clients.
 */
export function buildForgotPasswordEmailHtml(params: ForgotPasswordEmailParams): string {
  const { storeName, resetUrl, recipientEmail } = params;
  const year = new Date().getFullYear();
  const safeStore = escapeHtml(storeName);
  const href = safeHref(resetUrl);
  const safeEmail = escapeHtml(recipientEmail);
  const pre = escapeHtml(buildPreheader(PASSWORD_RESET_LINK_VALID_MINUTES));
  const minutes = PASSWORD_RESET_LINK_VALID_MINUTES;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Reset your password — ${safeStore}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Preheader (hidden): improves inbox snippet -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${pre}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="background:${BG_CARD};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <!-- Brand bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:4px;background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:32px 28px 8px;">
                    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${TEXT_PRIMARY};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      ${safeStore}
                    </p>
                    <p style="margin:20px 0 0;font-size:16px;line-height:1.55;color:${TEXT_PRIMARY};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Hi there,
                    </p>
                    <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:${TEXT_PRIMARY};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      We received a request to reset the password for <strong style="font-weight:600;">the account using this email address</strong>. Use the button below to choose a new password.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;" align="left">
                    <!-- Bulletproof button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${ACCENT}" style="border-radius:9999px;mso-padding-alt:14px 32px;">
                          <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.25;color:#ffffff !important;text-decoration:none;border-radius:9999px;">
                            Reset your password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px;">
                    <p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT_MUTED};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      This link expires in <strong style="color:${TEXT_PRIMARY};font-weight:600;">${minutes} minutes</strong>. If you didn’t request this, you can ignore this email — your password will stay the same.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${TEXT_FAINT};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Button not working?
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.45;color:${TEXT_MUTED};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Copy and paste this link into your browser:
                    </p>
                    <p style="margin:10px 0 0;padding:12px 14px;background:${URL_BOX_BG};border:1px solid ${BORDER};border-radius:10px;font-size:11px;line-height:1.5;word-break:break-all;color:#52525b;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;">
                      ${href}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 32px;border-top:1px solid ${BORDER};">
                    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${TEXT_FAINT};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Sent to ${safeEmail}<br />
                      <span style="color:${TEXT_FAINT};">We’ll never ask for your password by email.</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:${TEXT_FAINT};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
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
