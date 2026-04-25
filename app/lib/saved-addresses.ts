export type SavedAddress = {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  shipping_country: string;
  is_default: boolean;
  updated_at: string;
};

export function formatSavedAddressSummary(address: SavedAddress): string {
  const parts = [
    address.shipping_street.trim(),
    address.shipping_city.trim(),
    address.shipping_province.trim(),
    address.shipping_postal_code.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}
