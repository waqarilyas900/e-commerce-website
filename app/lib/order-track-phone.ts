import { phoneDigitsOnly } from "@/app/lib/validate-pakistan-phone";

/** Normalize PK mobiles to 10-digit national form (3XXXXXXXXX) for order lookup. */
export function normalizePakistanPhoneKey(phone: string): string {
  const d = phoneDigitsOnly(phone);
  if (!d) return "";
  if (d.startsWith("92") && d.length >= 12) {
    return d.slice(2, 12);
  }
  if (d.startsWith("0") && d.length >= 11) {
    return d.slice(1, 11);
  }
  if (d.length >= 10) {
    return d.slice(-10);
  }
  return d;
}

export function normalizeOrderNumberInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
