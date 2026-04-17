import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import { getAnnouncementBarForLayout } from "@/app/lib/home-marketing";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";
import { GoogleIdentityProvider as GoogleOneTap } from "@/components/auth/google-identity-provider";
import { CartProvider } from "@/app/providers/cart-provider";
import { NavCollectionsProvider } from "@/app/providers/nav-collections-provider";
import { HeaderNavMenuProvider } from "@/app/providers/header-nav-menu-provider";
import { StoreBrandProvider } from "@/app/providers/store-brand-provider";
import { getNavCollectionLinks } from "@/app/lib/nav-collections";
import { getHeaderNavMenuItems } from "@/app/lib/header-nav-menu";
import { AppToaster } from "@/components/ui/app-toaster";
import { HeaderStickyObserver } from "@/components/ui/header-sticky-observer";
import { DiscountNotificationPrompt } from "@/components/ui/discount-notification-prompt";
import "./globals.css";

/** Radstore.pk uses Jost for body copy */
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const showGoogleOneTap =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "1" ||
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "true";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadStoreBrandFromDatabase();
  const title = brand.siteTitle.trim() || brand.storeName.trim() || "Store";
  const description = brand.siteDescription.trim() || undefined;
  return {
    title,
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [baseBrand, announcementBar, collectionLinks, headerNavMenuItems] =
    await Promise.all([
      loadStoreBrandFromDatabase(),
      getAnnouncementBarForLayout(),
      getNavCollectionLinks(),
      getHeaderNavMenuItems(),
    ]);
  const storeBrand = { ...baseBrand, announcementBar };

  return (
    <html
      lang="en"
      dir="ltr"
      className={`js ${jost.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
                </CartProvider>
              )}
            </HeaderNavMenuProvider>
          </NavCollectionsProvider>
        </StoreBrandProvider>
      </body>
    </html>
  );
}
