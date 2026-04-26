import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import type { StoreBrandConfig } from "./store-brand.types";

const emptyFeatured: StoreBrandConfig["featured"] = {
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
  primaryLabel: "",
  primaryHref: "/",
  secondaryLabel: "",
  secondaryHref: "/",
};

const emptyWhy: StoreBrandConfig["whyShop"] = {
  eyebrow: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "/",
  reviewsLine: "",
  imageUrl: "",
};

function parseFooterLinks(raw: unknown): { label: string; href: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; href: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    const href = typeof o.href === "string" ? o.href : "";
    if (label.trim() && href.trim()) {
      out.push({ label: label.trim(), href: href.trim() });
    }
  }
  return out;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeInternalNavPath(href: string): string {
  let p = href.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function mapFooterItemsFromPolicyPages(
  rows: unknown,
): { label: string; href: string }[] {
  if (!Array.isArray(rows)) return [];
  const out: { label: string; href: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as { slug?: unknown; title?: unknown };
    const slug = String(r.slug ?? "").trim().toLowerCase();
    const title = String(r.title ?? "").trim();
    if (!slug || !SLUG_RE.test(slug) || !title) continue;
    const href = `/${slug}`;
    if (normalizeInternalNavPath(href) === normalizeInternalNavPath("/contact")) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ label: title, href });
  }
  return out;
}

function parseFeaturedBlock(raw: unknown): StoreBrandConfig["featured"] {
  if (!raw || typeof raw !== "object") return emptyFeatured;
  const o = raw as Record<string, unknown>;
  return {
    eyebrow: typeof o.eyebrow === "string" ? o.eyebrow : "",
    title: typeof o.title === "string" ? o.title : "",
    description: typeof o.description === "string" ? o.description : "",
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
    primaryLabel: typeof o.primaryLabel === "string" ? o.primaryLabel : "",
    primaryHref: typeof o.primaryHref === "string" && o.primaryHref ? o.primaryHref : "/",
    secondaryLabel: typeof o.secondaryLabel === "string" ? o.secondaryLabel : "",
    secondaryHref:
      typeof o.secondaryHref === "string" && o.secondaryHref ? o.secondaryHref : "/",
  };
}

function parseWhyShopBlock(raw: unknown): StoreBrandConfig["whyShop"] {
  if (!raw || typeof raw !== "object") return emptyWhy;
  const o = raw as Record<string, unknown>;
  return {
    eyebrow: typeof o.eyebrow === "string" ? o.eyebrow : "",
    title: typeof o.title === "string" ? o.title : "",
    body: typeof o.body === "string" ? o.body : "",
    ctaLabel: typeof o.ctaLabel === "string" ? o.ctaLabel : "",
    ctaHref: typeof o.ctaHref === "string" && o.ctaHref ? o.ctaHref : "/",
    reviewsLine: typeof o.reviewsLine === "string" ? o.reviewsLine : "",
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
  };
}

/**
 * Live storefront identity and marketing blocks from `store_settings`, `footer_settings`,
 * `home_page_settings`, and `policy_pages` (footer links).
 */
export async function loadStoreBrandFromDatabase(): Promise<StoreBrandConfig> {
  const empty: StoreBrandConfig = {
    storeName: "",
    siteTitle: "",
    siteDescription: "",
    faviconUrl: "",
    featured: emptyFeatured,
    whyShop: emptyWhy,
    footer: {
      supportEmail: "",
      phone: "",
      hoursLine: "",
      exploreLinks: [],
      customerCareSectionTitle: "Customer care",
      policyFooterLinks: [],
    },
  };

  if (!hasCatalogDb()) {
    return empty;
  }

  try {
    const supabase = await createClient();
    const [storeRes, footerTitleRes, homeRes, footerItemsRes] = await Promise.all([
      supabase
        .from("store_settings")
        .select(
          "store_name, site_title, site_description, support_email, footer_phone, footer_hours_line, footer_links",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("footer_settings")
        .select("customer_care_title")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("home_page_settings")
        .select("featured_block, why_shop_block")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("policy_pages")
        .select("slug, title, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
    ]);

    if (storeRes.error || !storeRes.data) {
      return empty;
    }

    const s = storeRes.data;
    const h = homeRes.data;
    const footerItems =
      !footerItemsRes.error && footerItemsRes.data
        ? mapFooterItemsFromPolicyPages(footerItemsRes.data)
        : [];

    const storeName = (s.store_name ?? "").trim();
    const siteTitleRaw = (s.site_title ?? "").trim();
    const siteDescription = (s.site_description ?? "").trim();
    const careRaw =
      !footerTitleRes.error && footerTitleRes.data
        ? String((footerTitleRes.data as { customer_care_title?: string }).customer_care_title ?? "").trim()
        : "";
    const customerCareTitle = careRaw || "Customer care";

    return {
      storeName,
      siteTitle: siteTitleRaw || storeName,
      siteDescription,
      faviconUrl: "",
      featured: parseFeaturedBlock(h?.featured_block),
      whyShop: parseWhyShopBlock(h?.why_shop_block),
      footer: {
        supportEmail: (s.support_email ?? "").trim(),
        phone: (s.footer_phone ?? "").trim(),
        hoursLine: (s.footer_hours_line ?? "").trim(),
        exploreLinks: parseFooterLinks(s.footer_links),
        customerCareSectionTitle: customerCareTitle,
        policyFooterLinks: footerItems,
      },
    };
  } catch {
    return empty;
  }
}

const FALLBACK_DISPLAY_NAME = "Store";

/**
 * Short display name from `store_settings` only (emails, geocode User-Agent, etc.).
 * When the row is missing or both fields are empty, returns a generic label — not env.
 */
export async function getStoreDisplayNameFromDatabase(): Promise<string> {
  if (!hasCatalogDb()) {
    return FALLBACK_DISPLAY_NAME;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("store_name, site_title")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      return FALLBACK_DISPLAY_NAME;
    }
    const name = (data.store_name ?? "").trim();
    if (name) return name;
    const title = (data.site_title ?? "").trim();
    if (title) return title;
    return FALLBACK_DISPLAY_NAME;
  } catch {
    return FALLBACK_DISPLAY_NAME;
  }
}
