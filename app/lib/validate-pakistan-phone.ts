/** Strip to digits for PK mobile validation (E.164 or local). */
export function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

/**
 * Pakistan mobile: 10 national digits starting with 3 (e.g. 3001234567).
 * Accepts +92…, 92…, or 03… formats from the phone input.
 */
export function isValidPakistanCheckoutPhone(phone: string): boolean {
  const d = phoneDigitsOnly(phone);
  if (!d) return false;
  let national: string;
  if (d.startsWith("92")) {
    national = d.slice(2);
  } else if (d.startsWith("0")) {
    national = d.slice(1);
  } else {
    national = d;
  }
  return /^3[0-9]{9}$/.test(national);
}

export function pakistanCheckoutPhoneError(phone: string | undefined): string | null {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) {
    return "Please enter a valid phone number for delivery.";
  }
  if (!isValidPakistanCheckoutPhone(trimmed)) {
    return "Enter a valid Pakistan mobile number (e.g. 0300 1234567).";
  }
  return null;
}
