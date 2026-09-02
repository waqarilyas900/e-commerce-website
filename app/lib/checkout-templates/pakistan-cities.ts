/** Major PK delivery cities for checkout autocomplete (province aligns with `PAKISTAN_PROVINCE_OPTIONS`). */
export type PakistanCityEntry = {
  name: string;
  province: string;
};

export const PAKISTAN_CITIES: PakistanCityEntry[] = [
  { name: "Abbottabad", province: "Khyber Pakhtunkhwa" },
  { name: "Attock", province: "Punjab" },
  { name: "Badin", province: "Sindh" },
  { name: "Bahawalpur", province: "Punjab" },
  { name: "Bannu", province: "Khyber Pakhtunkhwa" },
  { name: "Bhakkar", province: "Punjab" },
  { name: "Burewala", province: "Punjab" },
  { name: "Chakwal", province: "Punjab" },
  { name: "Charsadda", province: "Khyber Pakhtunkhwa" },
  { name: "Chiniot", province: "Punjab" },
  { name: "Dadu", province: "Sindh" },
  { name: "Dera Ghazi Khan", province: "Punjab" },
  { name: "Dera Ismail Khan", province: "Khyber Pakhtunkhwa" },
  { name: "Faisalabad", province: "Punjab" },
  { name: "Gilgit", province: "Gilgit-Baltistan" },
  { name: "Gojra", province: "Punjab" },
  { name: "Gujranwala", province: "Punjab" },
  { name: "Gujrat", province: "Punjab" },
  { name: "Hafizabad", province: "Punjab" },
  { name: "Haripur", province: "Khyber Pakhtunkhwa" },
  { name: "Hyderabad", province: "Sindh" },
  { name: "Islamabad", province: "Islamabad Capital Territory" },
  { name: "Jacobabad", province: "Sindh" },
  { name: "Jhang", province: "Punjab" },
  { name: "Jhelum", province: "Punjab" },
  { name: "Kamoke", province: "Punjab" },
  { name: "Karachi", province: "Sindh" },
  { name: "Kasur", province: "Punjab" },
  { name: "Khanewal", province: "Punjab" },
  { name: "Kohat", province: "Khyber Pakhtunkhwa" },
  { name: "Kot Addu", province: "Punjab" },
  { name: "Lahore", province: "Punjab" },
  { name: "Larkana", province: "Sindh" },
  { name: "Layyah", province: "Punjab" },
  { name: "Lodhran", province: "Punjab" },
  { name: "Mandi Bahauddin", province: "Punjab" },
  { name: "Mansehra", province: "Khyber Pakhtunkhwa" },
  { name: "Mardan", province: "Khyber Pakhtunkhwa" },
  { name: "Mianwali", province: "Punjab" },
  { name: "Mirpur", province: "Azad Jammu and Kashmir" },
  { name: "Mirpur Khas", province: "Sindh" },
  { name: "Multan", province: "Punjab" },
  { name: "Muzaffarabad", province: "Azad Jammu and Kashmir" },
  { name: "Muzaffargarh", province: "Punjab" },
  { name: "Nawabshah", province: "Sindh" },
  { name: "Nowshera", province: "Khyber Pakhtunkhwa" },
  { name: "Okara", province: "Punjab" },
  { name: "Pakpattan", province: "Punjab" },
  { name: "Peshawar", province: "Khyber Pakhtunkhwa" },
  { name: "Quetta", province: "Balochistan" },
  { name: "Rahim Yar Khan", province: "Punjab" },
  { name: "Rawalpindi", province: "Punjab" },
  { name: "Sahiwal", province: "Punjab" },
  { name: "Sargodha", province: "Punjab" },
  { name: "Sheikhupura", province: "Punjab" },
  { name: "Shikarpur", province: "Sindh" },
  { name: "Sialkot", province: "Punjab" },
  { name: "Skardu", province: "Gilgit-Baltistan" },
  { name: "Sukkur", province: "Sindh" },
  { name: "Swabi", province: "Khyber Pakhtunkhwa" },
  { name: "Swat", province: "Khyber Pakhtunkhwa" },
  { name: "Toba Tek Singh", province: "Punjab" },
  { name: "Turbat", province: "Balochistan" },
  { name: "Vehari", province: "Punjab" },
  { name: "Wah Cantonment", province: "Punjab" },
  { name: "Wazirabad", province: "Punjab" },
];

const byNameLower = new Map(
  PAKISTAN_CITIES.map((c) => [c.name.toLowerCase(), c] as const),
);

export function findPakistanCity(name: string): PakistanCityEntry | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  return byNameLower.get(key);
}

export function filterPakistanCities(query: string, limit = 8): PakistanCityEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PAKISTAN_CITIES.slice(0, limit);
  const hits: PakistanCityEntry[] = [];
  for (const city of PAKISTAN_CITIES) {
    if (city.name.toLowerCase().includes(q)) {
      hits.push(city);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
