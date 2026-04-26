/**
 * Tenant identity for SEO. Reads from focused, single-purpose tables:
 *
 *   public.seo_site                          → identity, NAP, default OG, locale
 *   public.seo_social_profiles               → sameAs[] + primary Twitter/Facebook
 *   public.seo_search_engine_verifications   → verification meta tags
 *
 * Each loader degrades gracefully when the SEO migration hasn't been applied
 * (queries silently return defaults).
 */

import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";
import type { SiteIdentity } from "./types";

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

let warnedMissing = false;
function warnMissingOnce(message: string) {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(
    `[seo] SEO tables not available (${message}). Apply the SEO migration; storefront will use defaults.`,
  );
}

type SeoSiteRow = {
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
};

type SeoSocialRow = {
  platform: string;
  url: string;
  handle: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type SeoVerificationRow = {
  google_site_verification: string | null;
  bing_site_verification: string | null;
  facebook_domain_verification: string | null;
  pinterest_site_verification: string | null;
  yandex_site_verification: string | null;
};

async function loadStoreCurrency(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("standard_delivery_currency")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return "PKR";
    const c = String((data as { standard_delivery_currency?: string }).standard_delivery_currency ?? "").trim();
    return c || "PKR";
  } catch {
    return "PKR";
  }
}

async function loadSeoSite(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SeoSiteRow | null> {
  const { data, error } = await supabase
    .from("seo_site")
    .select(
      "organization_legal_name, organization_logo_url, organization_phone, organization_email, address_street, address_city, address_region, address_postal_code, address_country, geo_lat, geo_lng, default_og_image_url, default_og_image_alt, locale",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    if (error.message) warnMissingOnce(error.message);
    return null;
  }
  return (data as unknown as SeoSiteRow) ?? null;
}

async function loadSeoSocialProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SeoSocialRow[]> {
  const { data, error } = await supabase
    .from("seo_social_profiles")
    .select("platform, url, handle, is_primary, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (error.message) warnMissingOnce(error.message);
    return [];
  }
  return (data as unknown as SeoSocialRow[]) ?? [];
}

async function loadSeoVerifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SeoVerificationRow | null> {
  const { data, error } = await supabase
    .from("seo_search_engine_verifications")
    .select(
      "google_site_verification, bing_site_verification, facebook_domain_verification, pinterest_site_verification, yandex_site_verification",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    if (error.message) warnMissingOnce(error.message);
    return null;
  }
  return (data as unknown as SeoVerificationRow) ?? null;
}

/**
 * Load tenant identity for `generateMetadata`. Pulls store name / title / description
 * from the existing `store_settings` row (via `loadStoreBrandFromDatabase`), then
 * augments with `seo_site` + social + verifications.
 */
export async function loadSiteIdentity(): Promise<SiteIdentity> {
  if (!hasCatalogDb()) return EMPTY_IDENTITY;
  try {
    const supabase = await createClient();
    const [brand, site, social, verifications, currency] = await Promise.all([
      loadStoreBrandFromDatabase(),
      loadSeoSite(supabase),
      loadSeoSocialProfiles(supabase),
      loadSeoVerifications(supabase),
      loadStoreCurrency(supabase),
    ]);

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

    return {
      storeName: brand.storeName || "",
      siteTitle: brand.siteTitle || brand.storeName || "",
      siteDescription: brand.siteDescription || "",
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
        facebookDomain: verifications?.facebook_domain_verification?.trim() || "",
        pinterest: verifications?.pinterest_site_verification?.trim() || "",
        yandex: verifications?.yandex_site_verification?.trim() || "",
      },
    };
  } catch (e) {
    warnMissingOnce(String(e));
    return EMPTY_IDENTITY;
  }
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
