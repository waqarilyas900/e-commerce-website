import { NextRequest, NextResponse } from "next/server";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Normalized for checkout `applyGeocode` (Nominatim-shaped `address`). */
type AddressParts = {
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

function jsonAddressResponse(address: AddressParts) {
  return NextResponse.json({ address });
}

/**
 * Photon (Komoot) — tolerates serverless IPs better than public Nominatim.
 * @see https://github.com/komoot/photon
 */
async function reversePhoton(lat: string, lon: string): Promise<AddressParts | null> {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: { properties?: Record<string, unknown> }[];
  };
  const props = data.features?.[0]?.properties;
  if (!props || typeof props !== "object") return null;

  const housenumber =
    typeof props.housenumber === "string" ? props.housenumber : undefined;
  const street = typeof props.street === "string" ? props.street : "";
  const name = typeof props.name === "string" ? props.name : "";
  const city =
    (typeof props.city === "string" && props.city) ||
    (typeof props.locality === "string" && props.locality) ||
    (typeof props.district === "string" && props.district) ||
    undefined;
  const postcode = typeof props.postcode === "string" ? props.postcode : undefined;
  const state = typeof props.state === "string" ? props.state : undefined;

  const road = street || undefined;
  const locality =
    (typeof props.locality === "string" && props.locality) ||
    (typeof props.district === "string" && props.district) ||
    undefined;

  const out: AddressParts = {};
  if (housenumber) out.house_number = housenumber;
  if (road) out.road = road;
  if (locality) out.suburb = locality;
  if (city) out.city = city;
  else if (name && !road) out.city = name;
  if (postcode) out.postcode = postcode;
  if (state) out.state = state;

  if (
    !out.city &&
    !out.road &&
    !out.postcode &&
    !out.state &&
    !out.house_number
  ) {
    return null;
  }
  return out;
}

/**
 * Nominatim — fallback; some hosts still get 403 from OSM.
 */
async function reverseNominatim(lat: string, lon: string): Promise<AddressParts | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      // Required by Nominatim; include a reachable site URL if you deploy publicly.
      "User-Agent": "EcomStorefrontCheckout/1.0 (+https://github.com/)",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { address?: AddressParts };
  if (!data.address || typeof data.address !== "object") return null;
  return data.address;
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`geocode:${ip}`, 60, 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat or lon" }, { status: 400 });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    let address = await reversePhoton(lat, lon);
    if (!address) {
      address = await reverseNominatim(lat, lon);
    }

    if (!address) {
      return NextResponse.json(
        { error: "Could not resolve address for this location" },
        { status: 502 },
      );
    }

    return jsonAddressResponse(address);
  } catch {
    return NextResponse.json(
      { error: "Geocoding request failed" },
      { status: 502 },
    );
  }
}
