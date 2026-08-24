"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/app/providers/auth-provider";
import { CartProvider } from "@/app/providers/cart-provider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { AppToaster } from "@/components/ui/app-toaster";
import { DeferredAppShells } from "@/components/ui/deferred-app-shells";
import { HeaderStickyObserver } from "@/components/ui/header-sticky-observer";

/** Routes that use their own chrome (or none) — skip storefront header/footer. */
function shouldShowStorefrontChrome(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname.startsWith("/checkout")) return false;
  if (pathname.startsWith("/newsletter")) return false;
  if (pathname.startsWith("/auth")) return false;
  return true;
}

/**
 * Client shell mounted once from root layout: auth + cart + storefront chrome
 * survive soft navigations (no Header/Footer remount flash on every route).
 */
export function StorefrontAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showChrome = shouldShowStorefrontChrome(pathname);

  return (
    <AuthProvider>
      <CartProvider>
        <HeaderStickyObserver />
        <div id="PageContainer" className="page-container">
          <div className="transition-body">
            {showChrome ? <TopStrip /> : null}
            {showChrome ? <Header /> : null}
            {children}
            {showChrome ? <Footer /> : null}
          </div>
        </div>
        <CartDrawer />
        <AppToaster />
        <DeferredAppShells />
      </CartProvider>
    </AuthProvider>
  );
}
