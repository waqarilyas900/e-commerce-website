/**
 * Cached layout data loaders — the small set of "always rendered" reads that
 * the root layout (`app/layout.tsx`) needs on every request: store brand,
 * announcement bar, nav collections, header nav menu, site identity (SEO),
 * and analytics IDs.
 *
 * Why a separate module:
 *   - The cookie-bound `createClient()` cannot run inside `unstable_cache` (it
 *     reads `cookies()` synchronously at request time). We use the cookie-free
 *     `createAnonServerSupabase()` for these public queries instead.
 *   - All of these reads are tenant-wide (one row per table); none of them
 *     depend on the signed-in user. They are safe to cache and bust by tag.
 *   - Caching this layer is what removes the 6 parallel DB roundtrips that
 *     were running on every navigation, the dominant cost behind the
 *     "1–2 second click delay" UX problem.
 *
 * Cache invalidation:
 *   - Default TTL is 5 minutes (revalidate = 300). Edits in the admin panel
 *     should call `/api/revalidate` with the appropriate tag (or `all: true`)
 *     to evict eagerly. See `LAYOUT_CACHE_TAGS` for the tag set.
 */

import { unstable_cache } from "next/cache";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { isEffectivelyEmptyHtml } from "@/app/lib/html-content";
import {
  sanitizeRichHtml,
  sanitizeRichHtmlList,
} from "@/lib/sanitize-rich-html";
import type {
  AnnouncementBarSettings,
  StoreBrandConfig,
} from "@/app/lib/store-brand.types";
import type { HeaderNavMenuItem } from "@/app/lib/header-nav-menu";
import type { NavCollectionLink } from "@/app/lib/nav-collections";
import type { AnalyticsConfig } from "@/lib/seo/analytics-config";
import type { SiteIdentity } from "@/lib/seo/types";

// ---------- Tags ----------

export const LAYOUT_CACHE_TAGS = {
  storeBrand: "layout:store-brand",
  announcementBar: "layout:announcement-bar",
  navCollections: "layout:nav-collections",
  headerNavMenu: "layout:header-nav-menu",
  siteIdentity: "layout:site-identity",
  analytics: "layout:analytics",
} as const;

/** Convenience: tags a `revalidate all` should always blow away. */
export const ALL_LAYOUT_CACHE_TAGS: readonly string[] = Object.values(
  LAYOUT_CACHE_TAGS,
);

const DEFAULT_REVALIDATE_SECONDS = 300;

// ---------- Empty defaults ----------

const EMPTY_FEATURED: StoreBrandConfig["featured"] = {
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
  primaryLabel: "",
  primaryHref: "/",
  secondaryLabel: "",
  secondaryHref: "/",
};

const EMPTY_WHY: StoreBrandConfig["whyShop"] = {
  eyebrow: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "/",
  reviewsLine: "",
  imageUrl: "",
};

const EMPTY_BRAND: StoreBrandConfig = {
  storeName: "",
  siteTitle: "",
  siteDescription: "",
  faviconUrl: "",
  featured: EMPTY_FEATURED,
  whyShop: EMPTY_WHY,
  footer: {
    supportEmail: "",
    phone: "",
    hoursLine: "",
    exploreLinks: [],
    customerCareSectionTitle: "Customer care",
    policyFooterLinks: [],
  },
};

const EMPTY_IDENTITY: SiteIdentity = {
  storeName: "",
  siteTitle: "",
  siteDescription: "",
  locale: "en_US",
  currency: "PKR",
  organizationLegalName: "",
  organizationLogoUrl: "",
  organizationPhone: "",
  organizationEmail: "",
  address: { street: "", city: "", region: "", postalCode: "", country: "PK" },
  geo: { lat: null, lng: null },
  sameAs: [],
  defaultOgImageUrl: "",
  defaultOgImageAlt: "",
  twitterHandle: "",
  facebookAppId: "",
  verifications: { google: "", bing: "", facebookDomain: "", pinterest: "", yandex: "" },
};

const EMPTY_ANALYTICS: AnalyticsConfig = {
  googleAnalyticsId: "",
  googleTagManagerId: "",
  metaPixelId: "",
  tiktokPixelId: "",
  consentRequired: false,
};

const DEFAULT_ANNOUNCEMENT_BG = "#1c1d1d";
const DEFAULT_ANNOUNCEMENT_FG = "#ffffff";
const DEFAULT_ROTATION_MS = 5000;
const MIN_ROTATION_MS = 3000;
const MAX_ROTATION_MS = 12000;

const EMPTY_ANNOUNCEMENT: AnnouncementBarSettings = {
  enabled: true,
  messages: [],
  rotationIntervalMs: DEFAULT_ROTATION_MS,
  html: "",
  backgroundColor: DEFAULT_ANNOUNCEMENT_BG,
  textColor: DEFAULT_ANNOUNCEMENT_FG,
};

// ---------- Helpers ----------

function clampRotationMs(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ROTATION_MS;
  return Math.min(MAX_ROTATION_MS, Math.max(MIN_ROTATION_MS, Math.round(n)));
}

function parseCssHex(input: string | null | undefined, fallback: string): string {
  if (!input || typeof input !== "string") return fallback;
  const t = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const h = t.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

function parseAnnouncementMessagesJson(raw: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = typeof item === "string" ? item : String(item ?? "");
      if (!isEffectivelyEmptyHtml(s)) {
        out.push(s.trim());
      }
    }
  }
  return out;
}

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
    if (normalizeInternalNavPath(href) === normalizeInternalNavPath("/about")) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ label: title, href });
  }
  return out;
}

function parseFeaturedBlock(raw: unknown): StoreBrandConfig["featured"] {
  if (!raw || typeof raw !== "object") return EMPTY_FEATURED;
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
  if (!raw || typeof raw !== "object") return EMPTY_WHY;
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

function pickHandleFromUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return path ? `@${path}` : "";
  } catch {
    return "";
  }
}

// ---------- Inner loaders (cookie-free) ----------

async function _loadStoreBrand(): Promise<StoreBrandConfig> {
  if (!hasCatalogDb()) return EMPTY_BRAND;
  try {
    const supabase = createAnonServerSupabase();
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

    if (storeRes.error || !storeRes.data) return EMPTY_BRAND;

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
        ? String(
            (footerTitleRes.data as { customer_care_title?: string })
              .customer_care_title ?? "",
          ).trim()
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
    return EMPTY_BRAND;
  }
}

async function _loadAnnouncementBar(): Promise<AnnouncementBarSettings> {
  try {
    const supabase = createAnonServerSupabase();
    const { data, error } = await supabase
      .from("home_page_settings")
      .select(
        "announcement_html, announcement_messages, announcement_rotation_ms, announcement_bar_bg, announcement_bar_fg, announcement_enabled",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return EMPTY_ANNOUNCEMENT;

    const rawMessages = parseAnnouncementMessagesJson(data.announcement_messages);
    const messages = sanitizeRichHtmlList(rawMessages);
    const html = messages[0] ?? "";

    const rawMs = data.announcement_rotation_ms;
    const rotationIntervalMs = clampRotationMs(
      typeof rawMs === "number" ? rawMs : Number(rawMs),
    );

    return {
      enabled: data.announcement_enabled !== false,
      messages,
      rotationIntervalMs,
      html,
      backgroundColor: parseCssHex(data.announcement_bar_bg, DEFAULT_ANNOUNCEMENT_BG),
      textColor: parseCssHex(data.announcement_bar_fg, DEFAULT_ANNOUNCEMENT_FG),
    };
  } catch {
    return EMPTY_ANNOUNCEMENT;
  }
}

// We sanitize mission HTML server-side to keep the policy/storefront client
// free of `jsdom`. Same path as `getHomeMarketingData` but cookie-free.
async function _loadHomeHeroAndMission(): Promise<{
  slides: import("@/app/lib/store-brand.types").HeroSlide[];
  missionParagraph: string;
}> {
  const empty = { slides: [], missionParagraph: "" } as {
    slides: import("@/app/lib/store-brand.types").HeroSlide[];
    missionParagraph: string;
  };
  try {
    const supabase = createAnonServerSupabase();
    const [settingsRes, slidesRes] = await Promise.all([
      supabase
        .from("home_page_settings")
        .select("mission_paragraph")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("home_hero_slides")
        .select("id, title, image_url, href, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (settingsRes.error || slidesRes.error) return empty;

    const rawMission = settingsRes.data?.mission_paragraph ?? "";
    const missionParagraph = isEffectivelyEmptyHtml(rawMission)
      ? ""
      : sanitizeRichHtml(rawMission);

    const rows = slidesRes.data ?? [];
    const slides = rows.flatMap((r) => {
      const title = (r.title ?? "").trim();
      const image = (r.image_url ?? "").trim();
      if (!title || !image) return [];
      return [
        {
          id: r.id,
          title,
          href: (r.href && r.href.trim()) || "/",
          image,
        },
      ];
    });

    return { slides, missionParagraph };
  } catch {
    return empty;
  }
}

async function _loadNavCollections(): Promise<NavCollectionLink[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = createAnonServerSupabase();
    const { data, error } = await supabase
      .from("collections")
      .select("slug, name, sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data.map((c) => ({ slug: c.slug as string, name: c.name as string }));
  } catch {
    return [];
  }
}

async function _loadHeaderNavMenu(): Promise<HeaderNavMenuItem[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = createAnonServerSupabase();
    const { data, error } = await supabase
      .from("header_nav_menu_items")
      .select("id, name, label, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      label: row.label as string,
      slug: row.slug as string,
      sort_order: Number(row.sort_order ?? 0),
      href: `/collections/${row.slug as string}`,
    }));
  } catch {
    return [];
  }
}

async function _loadSiteIdentity(): Promise<SiteIdentity> {
  if (!hasCatalogDb()) return EMPTY_IDENTITY;
  try {
    const supabase = createAnonServerSupabase();
    const [brand, siteRes, socialRes, verifyRes, currencyRes] = await Promise.all([
      _loadStoreBrand(),
      supabase
        .from("seo_site")
        .select(
          "organization_legal_name, organization_logo_url, organization_phone, organization_email, address_street, address_city, address_region, address_postal_code, address_country, geo_lat, geo_lng, default_og_image_url, default_og_image_alt, locale",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("seo_social_profiles")
        .select("platform, url, handle, is_primary, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("seo_search_engine_verifications")
        .select(
          "google_site_verification, bing_site_verification, facebook_domain_verification, pinterest_site_verification, yandex_site_verification",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("store_settings")
        .select("standard_delivery_currency")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const site = siteRes.data as
      | {
          organization_legal_name: string | null;
          organization_logo_url: string | null;
          organization_phone: string | null;
          organization_email: string | null;
          address_street: string | null;
          address_city: string | null;
          address_region: string | null;
          address_postal_code: string | null;
          address_country: string | null;
          geo_lat: number | null;
          geo_lng: number | null;
          default_og_image_url: string | null;
          default_og_image_alt: string | null;
          locale: string | null;
        }
      | null;
    const social = (socialRes.data ?? []) as {
      platform: string;
      url: string;
      handle: string | null;
      is_primary: boolean | null;
    }[];
    const verifications = verifyRes.data as
      | {
          google_site_verification: string | null;
          bing_site_verification: string | null;
          facebook_domain_verification: string | null;
          pinterest_site_verification: string | null;
          yandex_site_verification: string | null;
        }
      | null;
    const currency =
      String(
        (currencyRes.data as { standard_delivery_currency?: string } | null)
          ?.standard_delivery_currency ?? "",
      ).trim() || "PKR";

    const sameAs: string[] = [];
    let twitterHandle = "";
    let facebookAppId = "";
    for (const row of social) {
      const url = (row.url ?? "").trim();
      const platform = (row.platform ?? "").toLowerCase();
      if (platform === "twitter" && row.is_primary) {
        twitterHandle = (row.handle ?? "").trim() || pickHandleFromUrl(url);
      } else if (platform === "facebook_app" && row.is_primary) {
        facebookAppId = (row.handle ?? "").trim() || url;
      }
      if (platform !== "facebook_app" && /^https?:\/\//i.test(url)) {
        sameAs.push(url);
      }
    }
    // Keep Organization sameAs in sync with public footer social env URLs.
    for (const envUrl of [
      process.env.NEXT_PUBLIC_FACEBOOK_URL,
      process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    ]) {
      const u = (envUrl ?? "").trim();
      if (/^https?:\/\//i.test(u) && !sameAs.includes(u)) sameAs.push(u);
    }

    return {
      storeName: brand.storeName,
      siteTitle: brand.siteTitle || brand.storeName,
      siteDescription: brand.siteDescription,
      locale: site?.locale?.trim() || "en_US",
      currency,
      organizationLegalName: site?.organization_legal_name?.trim() || "",
      organizationLogoUrl: site?.organization_logo_url?.trim() || "",
      organizationPhone: site?.organization_phone?.trim() || "",
      organizationEmail: site?.organization_email?.trim() || "",
      address: {
        street: site?.address_street?.trim() || "",
        city: site?.address_city?.trim() || "",
        region: site?.address_region?.trim() || "",
        postalCode: site?.address_postal_code?.trim() || "",
        country: site?.address_country?.trim() || "PK",
      },
      geo: {
        lat: typeof site?.geo_lat === "number" ? site.geo_lat : null,
        lng: typeof site?.geo_lng === "number" ? site.geo_lng : null,
      },
      sameAs,
      defaultOgImageUrl: site?.default_og_image_url?.trim() || "",
      defaultOgImageAlt: site?.default_og_image_alt?.trim() || "",
      twitterHandle,
      facebookAppId,
      verifications: {
        google: verifications?.google_site_verification?.trim() || "",
        bing: verifications?.bing_site_verification?.trim() || "",
        facebookDomain:
          verifications?.facebook_domain_verification?.trim() || "",
        pinterest: verifications?.pinterest_site_verification?.trim() || "",
        yandex: verifications?.yandex_site_verification?.trim() || "",
      },
    };
  } catch {
    return EMPTY_IDENTITY;
  }
}

async function _loadAnalytics(): Promise<AnalyticsConfig> {
  /** Optional Vercel/env backup when `seo_analytics.google_analytics_id` is empty. */
  const envGa = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
  if (!hasCatalogDb()) {
    return { ...EMPTY_ANALYTICS, googleAnalyticsId: envGa };
  }
  try {
    const supabase = createAnonServerSupabase();
    const { data, error } = await supabase
      .from("seo_analytics")
      .select(
        "google_analytics_id, google_tag_manager_id, meta_pixel_id, tiktok_pixel_id, consent_required",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      return { ...EMPTY_ANALYTICS, googleAnalyticsId: envGa };
    }
    const row = data as unknown as Record<string, unknown>;
    return {
      googleAnalyticsId: String(row.google_analytics_id ?? "").trim() || envGa,
      googleTagManagerId: String(row.google_tag_manager_id ?? "").trim(),
      metaPixelId: String(row.meta_pixel_id ?? "").trim(),
      tiktokPixelId: String(row.tiktok_pixel_id ?? "").trim(),
      consentRequired: Boolean(row.consent_required),
    };
  } catch {
    return { ...EMPTY_ANALYTICS, googleAnalyticsId: envGa };
  }
}

// ---------- Cached public exports ----------

export const getCachedStoreBrand = unstable_cache(
  _loadStoreBrand,
  ["layout-store-brand-v4"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.storeBrand],
  },
);

export const getCachedAnnouncementBar = unstable_cache(
  _loadAnnouncementBar,
  ["layout-announcement-bar"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.announcementBar],
  },
);

export const getCachedHomeHeroAndMission = unstable_cache(
  _loadHomeHeroAndMission,
  ["layout-home-hero-mission-v2"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.storeBrand, LAYOUT_CACHE_TAGS.announcementBar],
  },
);

export const getCachedNavCollections = unstable_cache(
  _loadNavCollections,
  ["layout-nav-collections"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.navCollections],
  },
);

export const getCachedHeaderNavMenu = unstable_cache(
  _loadHeaderNavMenu,
  ["layout-header-nav-menu"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.headerNavMenu],
  },
);

export const getCachedSiteIdentity = unstable_cache(
  _loadSiteIdentity,
  ["layout-site-identity-v2"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.siteIdentity, LAYOUT_CACHE_TAGS.storeBrand],
  },
);

export const getCachedAnalyticsConfig = unstable_cache(
  _loadAnalytics,
  ["layout-analytics-v3"],
  {
    revalidate: DEFAULT_REVALIDATE_SECONDS,
    tags: [LAYOUT_CACHE_TAGS.analytics],
  },
);
