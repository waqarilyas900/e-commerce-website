/**
 * Supabase Edge Function: meta-capi
 *
 * Sends browser-deduped ecommerce events to Meta Conversions API from the Edge.
 *
 * Secrets:
 * - META_ACCESS_TOKEN (required)
 * - META_PIXEL_ID (defaults to 2830556603968775)
 * - SERVICE_ROLE_KEY (optional, improves signed-in user enrichment)
 * - EDGE_PUBLIC_SITE_URL | PUBLIC_SITE_URL | NEXT_PUBLIC_SITE_URL (optional CORS/site fallback)
 *
 * Auto-provided: SUPABASE_URL, SUPABASE_ANON_KEY
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient Deno types (not a runtime module)
/// <reference path="../edge-ambient.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

type MetaUserDataInput = {
  email?: unknown;
  phone?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  country?: unknown;
  external_id?: unknown;
  externalId?: unknown;
  em?: unknown;
  ph?: unknown;
  fn?: unknown;
  ln?: unknown;
  ct?: unknown;
  st?: unknown;
  zp?: unknown;
  fbp?: unknown;
  fbc?: unknown;
};

type CapiBody = {
  event_name?: unknown;
  event_id?: unknown;
  event_time?: unknown;
  event_source_url?: unknown;
  custom_data?: unknown;
  user_data?: MetaUserDataInput;
};

type EnrichedUser = {
  authId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

const PIXEL_ID_FALLBACK = "2830556603968775";
const GRAPH_VERSION = "v19.0";
// TODO: Remove this Events Manager test code after CAPI testing succeeds so live events flow normally.
const TEST_EVENT_CODE = "TEST18418";
const HEX_SHA256_RE = /^[a-f0-9]{64}$/i;

function jsonResponse(body: unknown, status = 200, corsOrigin = "*"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

function allowedOrigin(req: Request): string {
  const origin = req.headers.get("origin")?.trim();
  if (!origin) return "*";
  const allowed = [
    Deno.env.get("EDGE_PUBLIC_SITE_URL")?.trim(),
    Deno.env.get("PUBLIC_SITE_URL")?.trim(),
    Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim(),
  ].filter(Boolean) as string[];
  if (allowed.length === 0) return origin;
  return allowed.some((item) => item.replace(/\/$/, "") === origin.replace(/\/$/, ""))
    ? origin
    : allowed[0];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => asStringArray(item));
  const s = asString(value);
  return s ? [s] : [];
}

function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(input: string): string {
  return input.replace(/\D+/g, "");
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashValues(
  value: unknown,
  normalize: (input: string) => string,
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of asStringArray(value)) {
    const normalized = HEX_SHA256_RE.test(raw)
      ? raw.toLowerCase()
      : normalize(raw);
    if (!normalized) continue;
    const hashed = HEX_SHA256_RE.test(normalized)
      ? normalized
      : await sha256(normalized);
    if (seen.has(hashed)) continue;
    seen.add(hashed);
    out.push(hashed);
  }
  return out;
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return "";
  const encoded = encodeURIComponent(name);
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== encoded) continue;
    const value = rest.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return "";
}

function requestIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return (
    first ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    ""
  );
}

function requestUserAgent(req: Request): string {
  return req.headers.get("user-agent")?.trim() ?? "";
}

function fbcFromUrl(eventSourceUrl: string, eventTimeSeconds: number): string {
  if (!eventSourceUrl) return "";
  try {
    const url = new URL(eventSourceUrl);
    const fbclid = url.searchParams.get("fbclid")?.trim();
    if (!fbclid) return "";
    return `fb.1.${Math.floor(eventTimeSeconds * 1000)}.${fbclid}`;
  } catch {
    return "";
  }
}

function customData(input: unknown): Record<string, JsonValue> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, JsonValue>;
}

function bearerToken(req: Request): string {
  const auth = req.headers.get("authorization")?.trim() ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

async function enrichUserFromSupabase(req: Request): Promise<EnrichedUser> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")?.trim();
  const token = bearerToken(req);
  if (!supabaseUrl || !anonKey || !serviceKey || !token || token === anonKey) {
    return {};
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const authUser = authData.user;
  if (authError || !authUser) return {};

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from("users")
    .select("id, first_name, last_name, phone")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  const { data: address } = profile?.id
    ? await admin
        .from("user_saved_addresses")
        .select(
          "first_name, last_name, phone, shipping_city, shipping_province, shipping_postal_code, shipping_country",
        )
        .eq("user_id", profile.id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const authMeta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  return {
    authId: authUser.id,
    email: authUser.email ?? "",
    phone: asString(profile?.phone) || asString(address?.phone),
    firstName:
      asString(profile?.first_name) ||
      asString(address?.first_name) ||
      asString(authMeta.first_name) ||
      asString(authMeta.given_name),
    lastName:
      asString(profile?.last_name) ||
      asString(address?.last_name) ||
      asString(authMeta.last_name) ||
      asString(authMeta.family_name),
    city: asString(address?.shipping_city),
    state: asString(address?.shipping_province),
    zip: asString(address?.shipping_postal_code),
    country: asString(address?.shipping_country) || "PK",
  };
}

async function buildUserData(
  req: Request,
  input: MetaUserDataInput | undefined,
  enriched: EnrichedUser,
  eventSourceUrl: string,
  eventTime: number,
): Promise<Record<string, unknown>> {
  const body = input ?? {};
  const userData: Record<string, unknown> = {};

  const emailHashes = await hashValues(
    body.email ?? body.em ?? enriched.email,
    normalizeText,
  );
  if (emailHashes.length > 0) userData.em = emailHashes;

  const phoneHashes = await hashValues(
    body.phone ?? body.ph ?? enriched.phone,
    normalizePhone,
  );
  if (phoneHashes.length > 0) userData.ph = phoneHashes;

  const firstNameHashes = await hashValues(
    body.first_name ?? body.fn ?? enriched.firstName,
    normalizeText,
  );
  if (firstNameHashes.length > 0) userData.fn = firstNameHashes;

  const lastNameHashes = await hashValues(
    body.last_name ?? body.ln ?? enriched.lastName,
    normalizeText,
  );
  if (lastNameHashes.length > 0) userData.ln = lastNameHashes;

  const cityHashes = await hashValues(body.city ?? body.ct ?? enriched.city, normalizeText);
  if (cityHashes.length > 0) userData.ct = cityHashes;

  const stateHashes = await hashValues(body.state ?? body.st ?? enriched.state, normalizeText);
  if (stateHashes.length > 0) userData.st = stateHashes;

  const zipHashes = await hashValues(body.zip ?? body.zp ?? enriched.zip, normalizeText);
  if (zipHashes.length > 0) userData.zp = zipHashes;

  const countryHashes = await hashValues(body.country ?? enriched.country, normalizeText);
  if (countryHashes.length > 0) userData.country = countryHashes;

  const externalIdHashes = await hashValues(
    body.external_id ?? body.externalId ?? enriched.authId,
    normalizeText,
  );
  if (externalIdHashes.length > 0) userData.external_id = externalIdHashes[0];

  const fbp = readCookie(req, "_fbp") || asString(body.fbp);
  if (fbp) userData.fbp = fbp;

  const urlFbc = fbcFromUrl(eventSourceUrl, eventTime);
  const fbc = urlFbc || readCookie(req, "_fbc") || asString(body.fbc);
  if (fbc) userData.fbc = fbc;

  const ip = requestIp(req);
  if (ip) userData.client_ip_address = ip;

  const userAgent = requestUserAgent(req);
  if (userAgent) userData.client_user_agent = userAgent;

  return userData;
}

Deno.serve(async (req) => {
  const corsOrigin = allowedOrigin(req);
  if (req.method === "OPTIONS") return jsonResponse({ ok: true }, 200, corsOrigin);
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsOrigin);
  }

  const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN")?.trim();
  const pixelId = Deno.env.get("META_PIXEL_ID")?.trim() || PIXEL_ID_FALLBACK;
  if (!metaAccessToken) {
    console.error("[meta-capi-edge] missing META_ACCESS_TOKEN");
    return jsonResponse(
      { ok: false, error: "Meta CAPI is not configured." },
      503,
      corsOrigin,
    );
  }

  let body: CapiBody;
  try {
    body = (await req.json()) as CapiBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400, corsOrigin);
  }

  const eventName = asString(body.event_name);
  if (!eventName) {
    return jsonResponse({ ok: false, error: "event_name is required." }, 400, corsOrigin);
  }

  const eventId = asString(body.event_id);
  if (!eventId) {
    return jsonResponse({ ok: false, error: "event_id is required for deduplication." }, 400, corsOrigin);
  }
  const rawTime = Number(body.event_time);
  const eventTime =
    Number.isFinite(rawTime) && rawTime > 0
      ? Math.floor(rawTime)
      : Math.floor(Date.now() / 1000);
  const eventSourceUrl =
    asString(body.event_source_url) || req.headers.get("referer")?.trim() || "";

  const enriched = await enrichUserFromSupabase(req);
  const userData = await buildUserData(
    req,
    body.user_data,
    enriched,
    eventSourceUrl,
    eventTime,
  );

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
        user_data: userData,
        custom_data: customData(body.custom_data),
      },
    ],
    test_event_code: TEST_EVENT_CODE,
  };

  console.info("[meta-capi-edge] sending graph event", {
    eventName,
    eventId,
    hasFbp: Boolean(userData.fbp),
    hasFbc: Boolean(userData.fbc),
    hasFbclidInUrl: Boolean(fbcFromUrl(eventSourceUrl, eventTime)),
    hasEmail: Boolean(userData.em),
    hasPhone: Boolean(userData.ph),
  });

  const graphUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events`,
  );
  graphUrl.searchParams.set("access_token", metaAccessToken);

  let response: Response;
  try {
    response = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[meta-capi-edge] graph fetch failed", {
      eventName,
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { ok: false, error: "Could not reach Meta Graph API." },
      502,
      corsOrigin,
    );
  }

  const meta = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("[meta-capi-edge] graph rejected event", {
      eventName,
      eventId,
      status: response.status,
      meta,
    });
    return jsonResponse(
      { ok: false, error: "Meta Graph API rejected the event.", meta },
      502,
      corsOrigin,
    );
  }

  console.info("[meta-capi-edge] graph accepted event", {
    eventName,
    eventId,
    status: response.status,
  });

  return jsonResponse({ ok: true, meta }, 200, corsOrigin);
});
