import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import {
  getCachedAnalyticsConfig,
  getCachedAnnouncementBar,
  getCachedHeaderNavMenu,
  getCachedNavCollections,
  getCachedSiteIdentity,
  getCachedStoreBrand,
} from "@/lib/cache/layout-data";
import {
  applyEnvToSiteIdentity,
  applyEnvToStoreBrand,
  resolveFaviconUrl,
  resolveOrganizationLogoUrl,
  resolveSiteName,
} from "@/lib/site-brand-env";
import { getPublicSiteUrl } from "@/lib/site-url";
import { GoogleIdentityProvider as GoogleOneTap } from "@/components/auth/google-identity-provider";
import { NavCollectionsProvider } from "@/app/providers/nav-collections-provider";
import { HeaderNavMenuProvider } from "@/app/providers/header-nav-menu-provider";
import { AskTheStoreProvider } from "@/app/providers/ask-the-store-provider";
import { StoreBrandProvider } from "@/app/providers/store-brand-provider";
import { StorefrontAppShell } from "@/components/storefront-app-shell";
import {
  JsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import {
  metaPixelInlineScript,
  tiktokPixelInlineScript,
} from "@/lib/seo/pixel-snippets";
import { GOOGLE_ADSENSE_CLIENT_ID } from "@/lib/seo/google-adsense";
import "./globals.css";

/** Supabase SSR + `cookies()` require dynamic rendering; static prerender would throw. */
export const dynamic = "force-dynamic";

/**
 * Storefront typeface — Montserrat across UI.
 * 400 body · 500 nav/labels · 600 buttons/prices · 700 headings
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const showGoogleOneTap =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "1" ||
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "true";

function faviconMimeType(url: string): string | undefined {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

/** Resolve root-relative favicon paths against the public site URL for metadata. */
function absolutizeFavicon(href: string, base: string): string {
  const t = href.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const origin = base.replace(/\/$/, "");
  if (t.startsWith("/")) return `${origin}${t}`;
  return `${origin}/${t}`;
}


/**
 * The Supabase Storage host that serves user-uploaded media. Surfacing it as a
 * `<link rel="preconnect">` shaves ~50–150 ms off the LCP image fetch on
 * cold visits — measurable in PageSpeed Insights.
 */
function getStorageOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

/**
 * Parse a `#RRGGBB` / `#RGB` value to a clean hex string, falling back when the
 * input is empty or invalid. Used for `<meta name="theme-color">`.
 */
function parseThemeColor(input: string | null | undefined, fallback: string): string {
  const t = (input ?? "").trim();
  if (!t) return fallback;
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const h = t.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  const [brand, identityRaw] = await Promise.all([
    getCachedStoreBrand(),
    getCachedSiteIdentity(),
  ]);
  const identity = applyEnvToSiteIdentity(identityRaw);
  const siteName = resolveSiteName(
    identity.siteTitle,
    brand.siteTitle,
    identity.storeName,
    brand.storeName,
  );
  const description =
    identity.siteDescription.trim() || brand.siteDescription.trim() || undefined;
  const siteBase = getPublicSiteUrl();
  const rawIcon = resolveFaviconUrl(brand.faviconUrl);
  const icon = rawIcon ? absolutizeFavicon(rawIcon, siteBase) : undefined;
  const mime = icon ? faviconMimeType(icon) : undefined;

  // Per-page generateMetadata returns its own title; keep `default` for any page
  // that doesn't override (e.g. error boundaries).
  return {
    metadataBase: new URL(siteBase),
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
    applicationName: siteName,
    icons: icon
      ? {
          icon: [{ url: icon, ...(mime ? { type: mime } : {}) }],
          shortcut: icon,
          apple: [{ url: icon, sizes: "180x180", ...(mime ? { type: mime } : {}) }],
        }
      : undefined,
    verification: {
      google: identity.verifications.google || undefined,
      yandex: identity.verifications.yandex || undefined,
      other: {
        ...(identity.verifications.bing
          ? { "msvalidate.01": identity.verifications.bing }
          : {}),
        ...(identity.verifications.facebookDomain
          ? { "facebook-domain-verification": identity.verifications.facebookDomain }
          : {}),
        ...(identity.verifications.pinterest
          ? { "p:domain_verify": identity.verifications.pinterest }
          : {}),
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [baseBrand, announcementBar, collectionLinks, headerNavMenuItems, identityRaw, analytics] =
    await Promise.all([
      getCachedStoreBrand(),
      getCachedAnnouncementBar(),
      getCachedNavCollections(),
      getCachedHeaderNavMenu(),
      getCachedSiteIdentity(),
      getCachedAnalyticsConfig(),
    ]);
  const identity = applyEnvToSiteIdentity(identityRaw);
  const storeBrand = applyEnvToStoreBrand({ ...baseBrand, announcementBar });
  const faviconRaw = resolveFaviconUrl(baseBrand.faviconUrl);
  const faviconHref = faviconRaw ? absolutizeFavicon(faviconRaw, getPublicSiteUrl()) : "";
  const faviconType = faviconHref ? faviconMimeType(faviconHref) : undefined;
  const orgLd = organizationJsonLd({
    ...identity,
    storeName: identity.storeName || baseBrand.storeName,
    siteTitle: identity.siteTitle || baseBrand.siteTitle,
    organizationLogoUrl: resolveOrganizationLogoUrl(
      identity.organizationLogoUrl,
      baseBrand.faviconUrl,
    ),
  });
  const siteLd = websiteJsonLd({
    ...identity,
    siteTitle: identity.siteTitle || baseBrand.siteTitle,
    storeName: identity.storeName || baseBrand.storeName,
  });
  const htmlLang = (identity.locale || "en_PK").replace(/_/g, "-");
  const analyticsId = analytics.googleAnalyticsId;
  const gtmId = analytics.googleTagManagerId;
  const metaPixelId = analytics.metaPixelId;
  const tiktokPixelId = analytics.tiktokPixelId;
  const analyticsAllowed = !analytics.consentRequired;
  /**
   * GA4 (gtag) loads whenever a Measurement ID is configured, even if GTM is
   * also present, so GA4 setup / streams receive hits. If the same G- ID is
   * also fired from GTM, remove one side to avoid double page_view counts.
   */
  const loadDirectGoogleAnalytics =
    analyticsAllowed && analytics.googleAnalyticsId.trim().length > 0;
  /** Avoid double-firing pixels: when GTM is present it should own Meta/TikTok. */
  const standaloneMarketingTags = analyticsAllowed && !gtmId;
  const storageOrigin = getStorageOrigin();
  const themeColor = parseThemeColor(announcementBar.backgroundColor, "#1c1d1d");

  return (
    <html
      lang={htmlLang}
      dir="ltr"
      className={`js ${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content={themeColor} />
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        <meta name="google-adsense-account" content={GOOGLE_ADSENSE_CLIENT_ID} />
        <Script
          id="adsense-loader"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(GOOGLE_ADSENSE_CLIENT_ID)}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
        {storageOrigin ? (
          <>
            <link rel="preconnect" href={storageOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={storageOrigin} />
          </>
        ) : null}
        {faviconHref ? (
          <>
            <link
              rel="icon"
              href={faviconHref}
              sizes="any"
              {...(faviconType ? { type: faviconType } : {})}
            />
            <link rel="shortcut icon" href={faviconHref} />
            <link
              rel="apple-touch-icon"
              href={faviconHref}
              {...(faviconType ? { type: faviconType } : {})}
            />
          </>
        ) : null}
        <JsonLd id="ld-organization" data={orgLd} />
        <JsonLd id="ld-website" data={siteLd} />
        {/**
         * GTM / GA load after hydration so they do not contend with the LCP hero
         * on mobile Slow-4G. Tags still fire on first paint of interactive content.
         */}
        {analyticsAllowed && gtmId ? (
          <Script
            id="gtm-loader"
            strategy="afterInteractive"
          >{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode&&f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
        ) : null}
        {loadDirectGoogleAnalytics ? (
          <>
            <Script
              id="ga-loader"
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
            >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(analyticsId)},{anonymize_ip:true});`}</Script>
          </>
        ) : null}
        {standaloneMarketingTags && metaPixelId ? (
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
          >{metaPixelInlineScript(metaPixelId)}</Script>
        ) : null}
        {standaloneMarketingTags && tiktokPixelId ? (
          <Script
            id="tiktok-pixel"
            strategy="afterInteractive"
          >{tiktokPixelInlineScript(tiktokPixelId)}</Script>
        ) : null}
      </head>
      <body
        className={`${montserrat.className} template-index loaded min-h-full bg-white text-[#1c1d1d] font-normal antialiased`}
        data-transitions="true"
        data-type_header_capitalize="false"
        data-type_base_accent_transform="true"
        data-type_header_accent_transform="true"
        data-animate_sections="true"
        data-animate_underlines="true"
        data-animate_buttons="true"
        data-animate_images="true"
        data-animate_page_transition_style="page-fade-in-up"
        data-type_header_text_alignment="true"
        data-animate_images_style="zoom-fade"
        data-aos-easing="ease-out-quad"
        data-aos-duration="400"
        data-aos-delay="0"
      >
        {analyticsAllowed && gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {standaloneMarketingTags && metaPixelId ? (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height={1}
              width={1}
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
            />
          </noscript>
        ) : null}
        {/**
         * Click-to-navigate progress bar. Shown the instant a `<Link>` is
         * activated (long before the server has finished rendering the next
         * RSC payload), so users get immediate confirmation that their click
         * registered. Anchored to the brand's announcement-bar color so the
         * bar always reads as part of the storefront, not a dev tool.
         */}
        <NextTopLoader
          color={themeColor}
          height={3}
          showSpinner={false}
          shadow={`0 0 8px ${themeColor}, 0 0 4px ${themeColor}`}
          crawlSpeed={180}
          speed={260}
          easing="ease"
        />
        <StoreBrandProvider brand={storeBrand}>
          <AskTheStoreProvider>
            <NavCollectionsProvider links={collectionLinks}>
              <HeaderNavMenuProvider items={headerNavMenuItems}>
                {showGoogleOneTap ? (
                  <GoogleOneTap>
                    <StorefrontAppShell>{children}</StorefrontAppShell>
                  </GoogleOneTap>
                ) : (
                  <StorefrontAppShell>{children}</StorefrontAppShell>
                )}
              </HeaderNavMenuProvider>
            </NavCollectionsProvider>
          </AskTheStoreProvider>
        </StoreBrandProvider>
      </body>
    </html>
  );
}
