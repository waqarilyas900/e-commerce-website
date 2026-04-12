/**
 * Opaque reset token lifetime (see `password_reset_tokens.expires_at` and forgot-password API).
 */
export const PASSWORD_RESET_LINK_VALID_MINUTES = 30;

export function passwordResetLinkValidityCopy(): string {
  return `The link expires in ${PASSWORD_RESET_LINK_VALID_MINUTES} minutes.`;
}
