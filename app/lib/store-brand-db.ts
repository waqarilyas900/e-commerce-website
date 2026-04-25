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
 * Live storefront identity and marketing blocks from `store_settings` + `home_page_settings`.
 * No static catalog or env fallbacks.
 */
export async function loadStoreBrandFromDatabase(): Promise<StoreBrandConfig> {
  const empty: StoreBrandConfig = {
    storeName: "",
    siteTitle: "",
    siteDescription: "",
    featured: emptyFeatured,
    whyShop: emptyWhy,
    footer: {
      supportEmail: "",
      phone: "",
      hoursLine: "",
      exploreLinks: [],
    },
  };

  if (!hasCatalogDb()) {
    return empty;
  }

  try {
    const supabase = await createClient();
    const [storeRes, homeRes] = await Promise.all([
      supabase
        .from("store_settings")
        .select(
          "store_name, site_title, site_description, support_email, footer_phone, footer_hours_line, footer_links",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("home_page_settings")
        .select("featured_block, why_shop_block")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (storeRes.error || !storeRes.data) {
      return empty;
    }

    const s = storeRes.data;
    const h = homeRes.data;

    const storeName = (s.store_name ?? "").trim();
    const siteTitleRaw = (s.site_title ?? "").trim();
    const siteDescription = (s.site_description ?? "").trim();

    return {
      storeName,
      siteTitle: siteTitleRaw || storeName,
      siteDescription,
      featured: parseFeaturedBlock(h?.featured_block),
      whyShop: parseWhyShopBlock(h?.why_shop_block),
      footer: {
        supportEmail: (s.support_email ?? "").trim(),
        phone: (s.footer_phone ?? "").trim(),
        hoursLine: (s.footer_hours_line ?? "").trim(),
        exploreLinks: parseFooterLinks(s.footer_links),
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
