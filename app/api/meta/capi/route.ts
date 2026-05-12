import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

type MetaUserDataInput = {
  email?: unknown;
  phone?: unknown;
  em?: unknown;
  ph?: unknown;
  fbp?: unknown;
  fbc?: unknown;
};

type CapiRequestBody = {
  event_name?: unknown;
  event_id?: unknown;
  event_time?: unknown;
  event_source_url?: unknown;
  custom_data?: unknown;
  user_data?: MetaUserDataInput;
  test_event_code?: unknown;
};

const DEFAULT_GRAPH_VERSION = "v21.0";
const HEX_SHA256_RE = /^[a-f0-9]{64}$/i;
// TODO: Remove this Events Manager test code after CAPI testing succeeds so live events flow normally.
const META_TEST_EVENT_CODE = "TEST18418";

function metaGraphVersion(): string {
  const raw = process.env.FB_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D+/g, "");
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => asStrings(item));
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  return trimmed ? [trimmed] : [];
}

function hashUserValues(
  value: unknown,
  normalize: (input: string) => string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of asStrings(value)) {
    const normalized = HEX_SHA256_RE.test(raw) ? raw.toLowerCase() : normalize(raw);
    if (!normalized) continue;
    const hashed = HEX_SHA256_RE.test(normalized) ? normalized : sha256(normalized);
    if (seen.has(hashed)) continue;
    seen.add(hashed);
    out.push(hashed);
  }
  return out;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanCustomData(value: unknown): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, JsonValue>;
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return "";
  const encodedName = encodeURIComponent(name);
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key || key !== encodedName) continue;
    const value = rest.join("=");
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return "";
}

function fbcFromEventSourceUrl(
  eventSourceUrl: string,
  eventTimeSeconds: number,
): string {
  if (!eventSourceUrl) return "";
  try {
    const url = new URL(eventSourceUrl);
    const fbclid = url.searchParams.get("fbclid")?.trim();
    if (!fbclid) return "";
    const creationTimeMs =
      Number.isFinite(eventTimeSeconds) && eventTimeSeconds > 0
        ? eventTimeSeconds * 1000
        : Date.now();
    return `fb.1.${Math.floor(creationTimeMs)}.${fbclid}`;
  } catch {
    return "";
  }
}

function buildUserData(
  bodyUserData: MetaUserDataInput | undefined,
  req: Request,
  eventSourceUrl: string,
  eventTimeSeconds: number,
): Record<string, unknown> {
  const userData: Record<string, unknown> = {};
  const input = bodyUserData ?? {};

  const emails = hashUserValues(input.email ?? input.em, normalizeEmail);
  if (emails.length > 0) userData.em = emails;

  const phones = hashUserValues(input.phone ?? input.ph, normalizePhone);
  if (phones.length > 0) userData.ph = phones;

  const fbp = readCookie(req, "_fbp") || cleanString(input.fbp);
  if (fbp) userData.fbp = fbp;

  const fbc =
    readCookie(req, "_fbc") ||
    cleanString(input.fbc) ||
    fbcFromEventSourceUrl(eventSourceUrl, eventTimeSeconds);
  if (fbc) userData.fbc = fbc;

  const ip = getRequestIp(req);
  if (ip && ip !== "unknown") userData.client_ip_address = ip;

  const userAgent = cleanString(req.headers.get("user-agent"));
  if (userAgent) userData.client_user_agent = userAgent;

  return userData;
}

function eventNameToStatusCode(eventName: string, eventId: string): number | null {
  if (!eventName || eventName.length > 80) return 400;
  if (!eventId || eventId.length > 200) return 400;
  return null;
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`meta-capi:${ip}`, 120, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterMs);

  let body: CapiRequestBody;
  try {
    body = (await req.json()) as CapiRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const pixelId = process.env.FB_PIXEL_ID?.trim();
  const accessToken = process.env.FB_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) {
    console.error("[meta-capi] missing FB_PIXEL_ID or FB_ACCESS_TOKEN");
    return NextResponse.json(
      { ok: false, error: "Meta CAPI is not configured." },
      { status: 503 },
    );
  }

  const eventName = cleanString(body.event_name);
  const eventId = cleanString(body.event_id);
  const validationStatus = eventNameToStatusCode(eventName, eventId);
  if (validationStatus) {
    return NextResponse.json(
      { ok: false, error: "event_name and event_id are required." },
      { status: validationStatus },
    );
  }

  const rawEventTime = Number(body.event_time);
  const eventTime =
    Number.isFinite(rawEventTime) && rawEventTime > 0
      ? Math.floor(rawEventTime)
      : Math.floor(Date.now() / 1000);

  const eventSourceUrl =
    cleanString(body.event_source_url) || cleanString(req.headers.get("referer"));

  const event = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
    user_data: buildUserData(body.user_data, req, eventSourceUrl, eventTime),
    custom_data: cleanCustomData(body.custom_data),
  };

  const payload: Record<string, unknown> = {
    data: [event],
    test_event_code: META_TEST_EVENT_CODE,
  };

  const graphUrl = new URL(
    `https://graph.facebook.com/${metaGraphVersion()}/${encodeURIComponent(pixelId)}/events`,
  );
  graphUrl.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[meta-capi] graph fetch failed", {
      eventName,
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: "Could not reach Meta Graph API." },
      { status: 502 },
    );
  }

  const result = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    console.error("[meta-capi] graph rejected event", {
      eventName,
      eventId,
      status: response.status,
      meta: result,
    });
    return NextResponse.json(
      { ok: false, error: "Meta Graph API rejected the event.", meta: result },
      { status: 502 },
    );
  }

  console.info("[meta-capi] graph accepted event", {
    eventName,
    eventId,
    status: response.status,
  });

  return NextResponse.json({ ok: true, meta: result });
}
