import { NextResponse } from "next/server";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getPublicSiteUrl } from "@/lib/site-url";

/** Vercel / hosted: allow long OpenRouter calls (local dev ignores this). */
export const maxDuration = 120;

/** Node runtime: reliable outbound HTTPS to OpenRouter (avoid Edge fetch limits). */
export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const FETCH_TIMEOUT_MS = Math.min(
  120_000,
  Math.max(15_000, Number(process.env.OPENROUTER_FETCH_TIMEOUT_MS) || 90_000),
);

function isAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;
  const m = err.message.toLowerCase();
  return m.includes("abort") || m.includes("aborted");
}

/** Undici / Node often surface slow or stuck connects as AbortError or "timeout" messages. */
function isTimeoutLike(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  if (m.includes("timeout") || m.includes("timed out")) return true;
  const code = "code" in err ? String((err as { code?: unknown }).code) : "";
  return /TIMEOUT|ETIMEDOUT|UND_ERR_CONNECT/i.test(code);
}

function fetchErrorPayload(err: unknown, timeout: boolean): { error: string; details?: string } {
  const base = timeout
    ? `The model did not finish within ${Math.round(FETCH_TIMEOUT_MS / 1000)}s. Try a shorter question, set OPENROUTER_MODEL to a faster model, or raise OPENROUTER_FETCH_TIMEOUT_MS (max 120000).`
    : "Could not reach OpenRouter from this server (network, firewall, or DNS). Confirm OPENROUTER_API_KEY and that outbound HTTPS to openrouter.ai is allowed.";
  if (process.env.NODE_ENV !== "development") return { error: base };
  const msg = err instanceof Error ? err.message : String(err);
  return { error: base, details: msg.slice(0, 500) };
}

async function fetchOpenRouterChat(
  apiKey: string,
  hopHeaders: Record<string, string>,
  jsonBody: string,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const hop = attempt === 0 ? hopHeaders : {};
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          ...hop,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: jsonBody,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(tid);
      return res;
    } catch (e) {
      clearTimeout(tid);
      const timeout = isTimeoutLike(e);
      if (attempt === 0 && !timeout) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      throw e;
    }
  }
  throw new Error("OpenRouter fetch: unreachable");
}

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function sanitizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatMessage[] = [];
  const maxMessages = 24;
  const maxLen = 4000;
  for (const m of raw.slice(-maxMessages)) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, maxLen);
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  if (out.length === 0) return null;
  if (out[out.length - 1]!.role !== "user") return null;
  return out;
}

function sanitizeStoreName(raw: unknown): string {
  if (typeof raw !== "string") return "this store";
  const t = raw.trim().slice(0, 120);
  return t || "this store";
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Ask store AI is not configured on this server." },
      { status: 503 },
    );
  }

  const ip = getRequestIp(req);
  const rl = rateLimit(`store-ai:${ip}`, 24, 10 * 60_000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const messages = sanitizeMessages(obj.messages);
  if (!messages) {
    return NextResponse.json(
      { ok: false, error: "Provide a non-empty `messages` array ending with a user message." },
      { status: 400 },
    );
  }

  const storeName = sanitizeStoreName(obj.storeName);
  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const site = getPublicSiteUrl();
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim() || site;
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || `${storeName} — Ask store AI`;

  const systemContent = [
    `You are a helpful, concise store assistant for ${storeName} in this chat window.`,
    "Answer in plain language. Prefer short paragraphs or bullet lists when listing options.",
    "Do not invent prices, discounts, shipping times, or stock levels. If the shopper needs exact numbers or policies, tell them to check the product page, cart, checkout, or site policies pages.",
    "Help order, account, refund, and complaint questions as best you can from general store knowledge — do not tell the shopper to open a separate contact page, email form, or off-site support unless they explicitly ask how to reach the business outside this chat.",
    "Do not request or store passwords, payment card numbers, or government IDs.",
  ].join(" ");

  const openRouterMessages: { role: "system" | ChatRole; content: string }[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const payload = JSON.stringify({
    model,
    messages: openRouterMessages,
    temperature: 0.6,
    max_tokens: 600,
  });

  const hopHeaders: Record<string, string> = {
    "HTTP-Referer": referer,
    "X-OpenRouter-Title": title,
  };

  let res: Response;
  try {
    res = await fetchOpenRouterChat(apiKey, hopHeaders, payload);
  } catch (err: unknown) {
    console.error("[ask-the-store] OpenRouter fetch failed:", err);
    const timeout = isTimeoutLike(err);
    const { error, details } = fetchErrorPayload(err, timeout);
    return NextResponse.json(
      details ? { ok: false, error, details } : { ok: false, error },
      { status: timeout ? 504 : 502 },
    );
  }

  const rawText = await res.text();
  let data: unknown;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errMsg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      (data as { error?: { message?: string } }).error?.message
        ? String((data as { error: { message: string } }).error.message)
        : "Ask store AI request failed.";
    return NextResponse.json({ ok: false, error: errMsg }, { status: res.status >= 400 ? res.status : 502 });
  }

  const choices = data && typeof data === "object" && "choices" in data ? (data as { choices?: unknown }).choices : null;
  const first = Array.isArray(choices) ? choices[0] : null;
  const msg =
    first && typeof first === "object" && "message" in first
      ? (first as { message?: { content?: unknown } }).message
      : null;
  const content = msg && typeof msg.content === "string" ? msg.content.trim() : "";
  if (!content) {
    return NextResponse.json({ ok: false, error: "Empty response from the model." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, reply: content });
}
