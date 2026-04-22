/** Map `preview_voucher` / `place_order` `error_code` to storefront copy. */
export function voucherErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "code_required":
      return "Enter a voucher code.";
    case "not_authenticated":
      return "Sign in to use a voucher code.";
    case "profile_not_found":
      return "We could not load your profile. Try signing in again.";
    case "invalid_code":
      return "That code is not valid.";
    case "already_used":
      return "This voucher has already been used.";
    case "not_assigned":
      return "This code is not assigned to your account.";
    case "batch_inactive":
      return "This promotion is not active.";
    case "not_valid_now":
      return "This promotion is not valid at this time.";
    case "min_order_not_met":
      return "Your order does not meet the minimum for this voucher.";
    case "product_not_eligible":
      return "This voucher does not apply to items in your cart.";
    case "no_discount":
      return "No discount applies to this order.";
    case "not_configured":
      return "This voucher is not fully configured yet.";
    case "voucher_sign_in_required":
      return "Sign in to use a voucher code.";
    default:
      return fallback;
  }
}
