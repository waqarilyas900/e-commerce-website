import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import { getAnnouncementBarForLayout } from "@/app/lib/home-marketing";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";
import { getPublicSiteUrl } from "@/lib/site-url";
import { GoogleIdentityProvider as GoogleOneTap } from "@/components/auth/google-identity-provider";
import { CartProvider } from "@/app/providers/cart-provider";
import { NavCollectionsProvider } from "@/app/providers/nav-collections-provider";
import { HeaderNavMenuProvider } from "@/app/providers/header-nav-menu-provider";
import { AskTheStoreProvider } from "@/app/providers/ask-the-store-provider";
import { StoreBrandProvider } from "@/app/providers/store-brand-provider";
import { getNavCollectionLinks } from "@/app/lib/nav-collections";
import { getHeaderNavMenuItems } from "@/app/lib/header-nav-menu";
import { AppToaster } from "@/components/ui/app-toaster";
import { HeaderStickyObserver } from "@/components/ui/header-sticky-observer";
import { DiscountNotificationPrompt } from "@/components/ui/discount-notification-prompt";
import { AskTheStore } from "@/components/ask-the-store/ask-the-store";
import { loadAnalyticsConfig, loadSiteIdentity } from "@/lib/seo";
import {
  JsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import "./globals.css";

/** Supabase SSR + `cookies()` require dynamic rendering; static prerender would throw. */
export const dynamic = "force-dynamic";

/** Radstore.pk uses Jost for body copy */
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

function getEnvFaviconUrl(): string {
  return process.env.NEXT_PUBLIC_FAVICON_URL?.trim() ?? "";
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
  const [brand, identity] = await Promise.all([
    loadStoreBrandFromDatabase(),
    loadSiteIdentity(),
  ]);
  const siteName =
    identity.siteTitle.trim() ||
    brand.siteTitle.trim() ||
    identity.storeName.trim() ||
    brand.storeName.trim() ||
    "Store";
  const description =
    identity.siteDescription.trim() || brand.siteDescription.trim() || undefined;
  const siteBase = getPublicSiteUrl();
  const rawIcon = getEnvFaviconUrl() || brand.faviconUrl.trim();
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
  const [baseBrand, announcementBar, collectionLinks, headerNavMenuItems, identity, analytics] =
    await Promise.all([
      loadStoreBrandFromDatabase(),
      getAnnouncementBarForLayout(),
      getNavCollectionLinks(),
      getHeaderNavMenuItems(),
      loadSiteIdentity(),
      loadAnalyticsConfig(),
    ]);
  const storeBrand = { ...baseBrand, announcementBar };
  const envFavicon = getEnvFaviconUrl();
  const faviconRaw = envFavicon || baseBrand.faviconUrl.trim();
  const faviconHref = faviconRaw ? absolutizeFavicon(faviconRaw, getPublicSiteUrl()) : "";
  const faviconType = faviconHref ? faviconMimeType(faviconHref) : undefined;
  const orgLd = organizationJsonLd({
    ...identity,
    storeName: identity.storeName || baseBrand.storeName,
    siteTitle: identity.siteTitle || baseBrand.siteTitle,
    organizationLogoUrl: identity.organizationLogoUrl || baseBrand.faviconUrl,
  });
  const siteLd = websiteJsonLd({
    ...identity,
    siteTitle: identity.siteTitle || baseBrand.siteTitle,
    storeName: identity.storeName || baseBrand.storeName,
  });
  const htmlLang = (identity.locale || "en_US").split("_")[0] || "en";
  const analyticsId = analytics.googleAnalyticsId;
  const storageOrigin = getStorageOrigin();
  const themeColor = parseThemeColor(announcementBar.backgroundColor, "#1c1d1d");

  return (
    <html
      lang={htmlLang}
      dir="ltr"
      className={`js ${jost.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content={themeColor} />
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
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
        {analyticsId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}',{anonymize_ip:true});`,
              }}
            />
          </>
        ) : null}
      </head>
      <body
        className={`${jost.className} template-index loaded min-h-full bg-white text-[#1c1d1d]`}
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
        <StoreBrandProvider brand={storeBrand}>
          <AskTheStoreProvider>
            <NavCollectionsProvider links={collectionLinks}>
              <HeaderNavMenuProvider items={headerNavMenuItems}>
                {showGoogleOneTap ? (
                  <GoogleOneTap>
                    <CartProvider>
                      <HeaderStickyObserver />
                      <DiscountNotificationPrompt />
                      <div id="PageContainer" className="page-container">
                        <div className="transition-body">{children}</div>
                      </div>
                      <AppToaster />
                      <AskTheStore />
                    </CartProvider>
                  </GoogleOneTap>
                ) : (
                  <CartProvider>
                    <HeaderStickyObserver />
                    <DiscountNotificationPrompt />
                    <div id="PageContainer" className="page-container">
                      <div className="transition-body">{children}</div>
                    </div>
                    <AppToaster />
                    <AskTheStore />
                  </CartProvider>
                )}
              </HeaderNavMenuProvider>
            </NavCollectionsProvider>
          </AskTheStoreProvider>
        </StoreBrandProvider>
      </body>
    </html>
  );
}
