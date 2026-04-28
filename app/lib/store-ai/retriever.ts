import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  dbListAllActiveProductsForCards,
  dbListCollections,
  dbSearchProducts,
} from "@/app/lib/db/catalog";
import {
  dbGetPolicyPage,
  dbListPolicySummaries,
  type PolicySummary,
} from "@/app/lib/policy-pages-db";
import type { Product } from "@/app/lib/catalog/types";
import { getPublicSiteUrl } from "@/lib/site-url";
import { formatPkr } from "@/app/lib/format-currency";

/**
 * What the model is allowed to see for a single product. Excludes admin-only
 * fields (cost, supplier, internal notes), payment data, customer PII, and
 * any DB metadata. Mirrors the storefront PDP fields a logged-out shopper can
 * already read directly from the public site.
 */
export type StoreAiProductSnippet = {
  name: string;
  url: string;
  collection: string;
  shortDescription: string;
  priceLabel: string;
  inStock: boolean;
  hasDiscount: boolean;
  discountPercent: number | null;
};

export type StoreAiPolicySnippet = {
  title: string;
  url: string;
  summary: string;
};

export type StoreAiContext = {
  products: StoreAiProductSnippet[];
  policies: StoreAiPolicySnippet[];
  collections: { name: string; url: string }[];
  /** Plain-text block we feed to the model. */
  contextBlock: string;
  /** Cheap classifier output: did the user ask about products / policy / generic? */
  intent: StoreAiIntent;
};

export type StoreAiIntent = "product" | "policy" | "support" | "off-topic" | "generic";

const POLICY_KEYWORDS: { kw: RegExp; slugHint: string }[] = [
  { kw: /\b(refund|refunds?)\b/i, slugHint: "refund" },
  { kw: /\b(return|returns?|exchange)\b/i, slugHint: "return" },
  { kw: /\b(ship|shipping|delivery|courier|cod)\b/i, slugHint: "ship" },
  { kw: /\b(privacy|gdpr|data)\b/i, slugHint: "privacy" },
  { kw: /\b(terms|t&c|conditions|policy)\b/i, slugHint: "terms" },
  { kw: /\b(contact|email|whatsapp|support)\b/i, slugHint: "contact" },
];

const SUPPORT_KEYWORDS = /\b(order|account|login|sign[- ]?in|password|complaint|cancel|refund|tracking|whatsapp|phone)\b/i;
const OFF_TOPIC_KEYWORDS =
  /\b(weather|news|stocks?|crypto|movie|movies|football|cricket|politic|election|recipe|ai\s+model|chatgpt|llm)\b/i;
const PRODUCT_HINTS = /\b(product|buy|price|stock|available|sell|cheap|discount|sale|find|recommend|need|looking|search)\b/i;

function pickIntent(query: string): StoreAiIntent {
  const q = query.trim();
  if (!q) return "generic";
  if (POLICY_KEYWORDS.some(({ kw }) => kw.test(q))) return "policy";
  if (SUPPORT_KEYWORDS.test(q)) return "support";
  if (OFF_TOPIC_KEYWORDS.test(q)) return "off-topic";
  if (PRODUCT_HINTS.test(q)) return "product";
  return "generic";
}

/**
 * Strip HTML to plain text for the model context. Keeps it cheap (no DOM lib);
 * we just need the readable copy from policy pages and product descriptions.
 */
function stripHtml(html: string | null | undefined, maxLen: number): string {
  if (!html) return "";
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}…`;
}

function productToSnippet(p: Product, baseUrl: string): StoreAiProductSnippet {
  const slug = p.slug?.trim() ?? "";
  const url = slug ? `${baseUrl}/products/${slug}` : baseUrl;
  const shortDescription =
    stripHtml(p.shortDescription || p.description, 220) || "";
  const collection = p.collection && p.collection !== "uncategorized" ? p.collection : "";
  const hasDiscount = Boolean(
    p.compareAtPrice != null && p.compareAtPrice > p.price && p.price > 0,
  );
  const discountPercent = hasDiscount
    ? Math.round((1 - p.price / (p.compareAtPrice as number)) * 100)
    : null;
  const priceLabel = hasDiscount
    ? `${formatPkr(p.price)} (was ${formatPkr(p.compareAtPrice as number)})`
    : formatPkr(p.price);
  return {
    name: p.name,
    url,
    collection,
    shortDescription,
    priceLabel,
    inStock: p.inStock !== false,
    hasDiscount,
    discountPercent,
  };
}

function uniqueByUrl<T extends { url: string }>(rows: T[], cap: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Build a small set of high-signal queries from the user message. We expand
 * to first/last token + the full string so the LIKE search still finds matches
 * for "do you have wooden needles" without needing trigram indexes.
 */
function expandQueries(message: string): string[] {
  const cleaned = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const phrases = new Set<string>();
  if (cleaned.length >= 3) phrases.add(cleaned);
  for (const t of tokens.slice(0, 4)) phrases.add(t);
  return Array.from(phrases).slice(0, 4);
}

const STOPWORDS = new Set(
  [
    "the",
    "and",
    "for",
    "are",
    "you",
    "your",
    "any",
    "have",
    "has",
    "this",
    "that",
    "with",
    "what",
    "when",
    "where",
    "why",
    "how",
    "who",
    "from",
    "about",
    "please",
    "buy",
    "tell",
    "want",
    "need",
    "find",
    "show",
    "give",
    "into",
    "one",
    "two",
    "all",
    "best",
  ],
);

async function searchProductsExpanded(message: string): Promise<Product[]> {
  const queries = expandQueries(message);
  if (!queries.length) return [];
  const collected: Product[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    const rows = await dbSearchProducts(q);
    for (const p of rows) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      collected.push(p);
      if (collected.length >= 12) return collected;
    }
  }
  return collected;
}

async function pickFallbackProducts(): Promise<Product[]> {
  const all = await dbListAllActiveProductsForCards();
  const onSale = all.filter(
    (p) => p.compareAtPrice != null && p.compareAtPrice > p.price && p.inStock !== false,
  );
  if (onSale.length) return onSale.slice(0, 6);
  return all.slice(0, 6);
}

async function loadPolicies(query: string, max: number): Promise<StoreAiPolicySnippet[]> {
  if (!hasCatalogDb()) return [];
  const summaries = await dbListPolicySummaries();
  if (!summaries.length) return [];
  const base = getPublicSiteUrl();
  const lower = query.toLowerCase();
  /** Hint matching first; fall back to all policies up to `max`. */
  const ranked: PolicySummary[] = [];
  const seen = new Set<string>();
  for (const { kw, slugHint } of POLICY_KEYWORDS) {
    if (!kw.test(query)) continue;
    for (const s of summaries) {
      if (seen.has(s.slug)) continue;
      if (
        s.slug.toLowerCase().includes(slugHint) ||
        s.title.toLowerCase().includes(slugHint)
      ) {
        seen.add(s.slug);
        ranked.push(s);
      }
    }
  }
  for (const s of summaries) {
    if (seen.has(s.slug)) continue;
    if (
      s.title.toLowerCase().includes(lower) ||
      s.slug.toLowerCase().includes(lower)
    ) {
      seen.add(s.slug);
      ranked.push(s);
    }
  }
  /** No clear match: include sort-ordered list so the model still has citations. */
  if (!ranked.length) ranked.push(...summaries.slice(0, max));

  const picks = ranked.slice(0, max);
  const out: StoreAiPolicySnippet[] = [];
  for (const p of picks) {
    const detail = await dbGetPolicyPage(p.slug);
    out.push({
      title: detail?.title || p.title,
      url: `${base}/${encodeURIComponent(p.slug)}`,
      summary: stripHtml(detail?.contentHtml ?? "", 360),
    });
  }
  return out;
}

async function loadCollections(): Promise<{ name: string; url: string }[]> {
  if (!hasCatalogDb()) return [];
  const base = getPublicSiteUrl();
  const rows = await dbListCollections();
  return rows.slice(0, 12).map((c) => ({
    name: c.name,
    url: `${base}/collections/${encodeURIComponent(c.slug)}`,
  }));
}

async function loadStoreContacts(): Promise<{ supportEmail: string; supportPhone: string }> {
  if (!hasCatalogDb()) {
    return {
      supportEmail: process.env.NEXT_PUBLIC_DEFAULT_SUPPORT_EMAIL?.trim() ?? "",
      supportPhone: "",
    };
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_settings")
      .select("support_email, support_phone, store_name")
      .limit(1)
      .maybeSingle();
    const row = data as
      | { support_email: string | null; support_phone: string | null; store_name: string | null }
      | null
      | undefined;
    return {
      supportEmail:
        row?.support_email?.trim() ||
        process.env.NEXT_PUBLIC_DEFAULT_SUPPORT_EMAIL?.trim() ||
        "",
      supportPhone: row?.support_phone?.trim() || "",
    };
  } catch {
    return {
      supportEmail: process.env.NEXT_PUBLIC_DEFAULT_SUPPORT_EMAIL?.trim() ?? "",
      supportPhone: "",
    };
  }
}

function renderProductLine(s: StoreAiProductSnippet): string {
  const parts = [
    `- ${s.name}`,
    `URL: ${s.url}`,
    `Price: ${s.priceLabel}`,
    `Stock: ${s.inStock ? "in stock" : "out of stock"}`,
  ];
  if (s.collection) parts.push(`Category: ${s.collection}`);
  if (s.shortDescription) parts.push(`Notes: ${s.shortDescription}`);
  return parts.join(" | ");
}

function renderPolicyLine(p: StoreAiPolicySnippet): string {
  const summary = p.summary ? `: ${p.summary}` : "";
  return `- ${p.title} (${p.url})${summary}`;
}

function renderContactsBlock(c: { supportEmail: string; supportPhone: string }): string {
  const parts: string[] = [];
  if (c.supportEmail) parts.push(`Email: ${c.supportEmail}`);
  if (c.supportPhone) parts.push(`Phone/WhatsApp: ${c.supportPhone}`);
  return parts.length ? parts.join(" | ") : "(no public support contact configured)";
}

/**
 * Build the model context block. The structure is intentionally simple — one
 * "section: lines" per data type, with leading rules about how to use it. The
 * route adds a final "USER QUESTION:" block, so we end this with a separator
 * line.
 */
function renderContextBlock(args: {
  intent: StoreAiIntent;
  products: StoreAiProductSnippet[];
  policies: StoreAiPolicySnippet[];
  collections: { name: string; url: string }[];
  contacts: { supportEmail: string; supportPhone: string };
  storeName: string;
}): string {
  const lines: string[] = [];
  lines.push(`STORE: ${args.storeName}`);
  lines.push(
    `CONTACTS: ${renderContactsBlock(args.contacts)}`,
  );
  if (args.collections.length) {
    lines.push("");
    lines.push("COLLECTIONS:");
    for (const c of args.collections) lines.push(`- ${c.name} (${c.url})`);
  }
  if (args.products.length) {
    lines.push("");
    lines.push("MATCHING PRODUCTS (only these may be referenced):");
    for (const p of args.products) lines.push(renderProductLine(p));
  } else {
    lines.push("");
    lines.push("MATCHING PRODUCTS: (no rows; the catalog has no items matching this query.)");
  }
  if (args.policies.length) {
    lines.push("");
    lines.push("POLICY PAGES:");
    for (const p of args.policies) lines.push(renderPolicyLine(p));
  }
  lines.push("");
  lines.push(`INTENT: ${args.intent}`);
  return lines.join("\n");
}

/**
 * Build the full grounding context for a chat turn. Caller passes the latest
 * user message; we pull a minimal, safe slice of the catalog to feed the LLM.
 */
export async function buildStoreAiContext(args: {
  latestUserMessage: string;
  storeName: string;
}): Promise<StoreAiContext> {
  const intent = pickIntent(args.latestUserMessage);
  const baseUrl = getPublicSiteUrl();

  const [collections, contacts] = await Promise.all([
    loadCollections(),
    loadStoreContacts(),
  ]);

  let productRows: Product[] = [];
  if (intent === "product" || intent === "generic" || intent === "support") {
    productRows = await searchProductsExpanded(args.latestUserMessage);
  }
  if (!productRows.length && (intent === "product" || intent === "generic")) {
    productRows = await pickFallbackProducts();
  }

  const products = uniqueByUrl(
    productRows.map((p) => productToSnippet(p, baseUrl)),
    8,
  );

  const policies =
    intent === "policy" || intent === "support"
      ? await loadPolicies(args.latestUserMessage, 4)
      : await loadPolicies(args.latestUserMessage, 2);

  const contextBlock = renderContextBlock({
    intent,
    products,
    policies,
    collections,
    contacts,
    storeName: args.storeName,
  });

  return {
    products,
    policies,
    collections,
    contextBlock,
    intent,
  };
}
