/** Address fragments returned by `/api/geocode/reverse` (Nominatim-style). */
export type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
  state?: string;
};

/** Map OSM state/region names to Pakistan province values used in checkout/profile. */
export function mapStateToPakistanProvince(state: string | undefined): string {
  if (!state) return "";
  const s = state.toLowerCase();
  if (s.includes("punjab")) return "Punjab";
  if (s.includes("sindh")) return "Sindh";
  if (s.includes("khyber") || s.includes("kpk")) return "Khyber Pakhtunkhwa";
  if (s.includes("baloch")) return "Balochistan";
  if (s.includes("islamabad")) return "Islamabad Capital Territory";
  if (s.includes("gilgit")) return "Gilgit-Baltistan";
  if (s.includes("kashmir") || s.includes("ajk")) return "Azad Jammu and Kashmir";
  return "";
}

/** Fields to merge into `addressForm` after a successful reverse-geocode. */
export function nominatimToSavedAddressPatch(addr: NominatimAddress): Partial<{
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
}> {
  const parts = [
    addr.house_number,
    addr.road,
    addr.suburb || addr.neighbourhood,
  ].filter(Boolean);
  const street = parts.length ? parts.join(", ") : "";
  const city = (addr.city || addr.town || addr.village || "").trim();
  const postcode = (addr.postcode ?? "").trim();
  const province = mapStateToPakistanProvince(addr.state);

  const patch: Partial<{
    shipping_street: string;
    shipping_city: string;
    shipping_postal_code: string;
    shipping_province: string;
  }> = {};
  if (street) patch.shipping_street = street;
  if (city) patch.shipping_city = city;
  if (postcode) patch.shipping_postal_code = postcode;
  if (province) patch.shipping_province = province;
  return patch;
}
