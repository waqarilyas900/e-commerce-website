"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/app/providers/auth-provider";
import { CartProvider } from "@/app/providers/cart-provider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AppToaster } from "@/components/ui/app-toaster";
import { DeferredAppShells } from "@/components/ui/deferred-app-shells";
import { HeaderStickyObserver } from "@/components/ui/header-sticky-observer";

/**
 * Client shell mounted once from root layout: auth + cart state and the cart
 * drawer survive route changes (Header remounts per page, drawer does not).
 */
export function StorefrontAppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <HeaderStickyObserver />
        <div id="PageContainer" className="page-container">
          <div className="transition-body">{children}</div>
        </div>
        <CartDrawer />
        <AppToaster />
        <DeferredAppShells />
      </CartProvider>
    </AuthProvider>
  );
}
