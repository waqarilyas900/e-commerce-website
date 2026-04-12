import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import { getStoreBrand } from "@/app/lib/store-brand";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { CartProvider } from "@/app/providers/cart-provider";
import { NavCollectionsProvider } from "@/app/providers/nav-collections-provider";
import { StoreBrandProvider } from "@/app/providers/store-brand-provider";
import { getNavCollectionLinks } from "@/app/lib/nav-collections";
import { AppToaster } from "@/components/ui/app-toaster";
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

const brand = getStoreBrand();

const showGoogleOneTap =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "1" ||
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP === "true";

export const metadata: Metadata = {
  title: brand.siteTitle,
  description: brand.siteDescription,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const collectionLinks = await getNavCollectionLinks();

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
        <StoreBrandProvider brand={brand}>
          <NavCollectionsProvider links={collectionLinks}>
            {showGoogleOneTap ? <GoogleOneTap /> : null}
            <CartProvider>
              <div id="PageContainer" className="page-container">
                <div className="transition-body">{children}</div>
              </div>
              <AppToaster />
            </CartProvider>
          </NavCollectionsProvider>
        </StoreBrandProvider>
      </body>
    </html>
  );
}
