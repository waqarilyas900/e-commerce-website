"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutChrome } from "@/components/checkout/checkout-chrome";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import {
  CHECKOUT_PENDING_CART_CLEAR_KEY,
  CHECKOUT_PENDING_PURCHASE_EVENT_KEY,
  CHECKOUT_THANK_YOU_META_KEY,
} from "@/app/lib/checkout-thank-you";
import { useCart } from "@/app/providers/cart-provider";
import { createClient } from "@/lib/supabase/client";
import { defaultMetaCurrency, toPkrValue, trackMetaPixel } from "@/lib/seo/meta-pixel-client";

function ThankYouFallback() {
  return (
    <CheckoutChrome mode="complete">
      <main
        id="MainContent"
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
      >
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    </CheckoutChrome>
  );
}

function CheckoutThankYouInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const cartClearDone = useRef(false);
  const purchaseTrackedRef = useRef(false);
  const order = searchParams.get("order");
  const totalStr = searchParams.get("total_cents");

  const totalCents =
    totalStr != null ? Number.parseInt(totalStr, 10) : Number.NaN;
  const paramsValid =
    Boolean(order && order.length > 0) &&
    !Number.isNaN(totalCents) &&
    totalCents >= 0;

  const [meta, setMeta] = useState<{
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    signedIn: boolean;
  } | null>(null);

  useEffect(() => {
    if (!paramsValid || cartClearDone.current) return;
    let fromCheckoutFlow = false;
    try {
      fromCheckoutFlow = sessionStorage.getItem(CHECKOUT_PENDING_CART_CLEAR_KEY) === "1";
      if (fromCheckoutFlow) {
        sessionStorage.removeItem(CHECKOUT_PENDING_CART_CLEAR_KEY);
      }
    } catch {
      /* private mode / quota */
    }
    if (fromCheckoutFlow) {
      cartClearDone.current = true;
      clearCart();
    }
  }, [paramsValid, clearCart]);

  useEffect(() => {
    if (!paramsValid || purchaseTrackedRef.current) return;
    purchaseTrackedRef.current = true;
    type PendingPurchase = {
      orderNumber?: string;
      totalCents?: number;
      currency?: string;
      contentIds?: string[];
      numItems?: number;
    };
    type PendingMeta = {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      signedIn?: boolean;
    };
    let pending: PendingPurchase | null = null;
    let pendingMeta: PendingMeta | null = null;
    try {
      const raw = sessionStorage.getItem(CHECKOUT_PENDING_PURCHASE_EVENT_KEY);
      if (raw) {
        pending = JSON.parse(raw) as PendingPurchase;
        sessionStorage.removeItem(CHECKOUT_PENDING_PURCHASE_EVENT_KEY);
      }
      const rawMeta = sessionStorage.getItem(CHECKOUT_THANK_YOU_META_KEY);
      if (rawMeta) {
        pendingMeta = JSON.parse(rawMeta) as PendingMeta;
      }
    } catch {
      // Ignore storage failures and fall back to query params.
    }
    const contentIds =
      pending?.contentIds?.filter((id) => typeof id === "string" && id.trim() !== "") ?? [];
    const numItems =
      typeof pending?.numItems === "number" && Number.isFinite(pending.numItems) && pending.numItems > 0
        ? Math.round(pending.numItems)
        : undefined;
    trackMetaPixel("Purchase", {
      content_ids: contentIds,
      content_type: "product",
      currency: pending?.currency?.trim() || defaultMetaCurrency(),
      value: toPkrValue(totalCents / 100),
      ...(order ? { order_id: order } : {}),
      ...(numItems != null ? { num_items: numItems } : {}),
    }, {
      userData: {
        ...(pendingMeta?.email ? { email: pendingMeta.email } : {}),
        ...(pendingMeta?.phone ? { phone: pendingMeta.phone } : {}),
        ...(pendingMeta?.firstName ? { first_name: pendingMeta.firstName } : {}),
        ...(pendingMeta?.lastName ? { last_name: pendingMeta.lastName } : {}),
        ...(pendingMeta?.city ? { city: pendingMeta.city } : {}),
        ...(pendingMeta?.state ? { state: pendingMeta.state } : {}),
        ...(pendingMeta?.zip ? { zip: pendingMeta.zip } : {}),
        ...(pendingMeta?.country ? { country: pendingMeta.country } : {}),
      },
    });
  }, [paramsValid, order, totalCents]);

  useEffect(() => {
    if (!paramsValid) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      let fromStorage: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        signedIn: boolean;
      } = { signedIn: false };
      try {
        const raw = sessionStorage.getItem(CHECKOUT_THANK_YOU_META_KEY);
        if (raw) {
          fromStorage = JSON.parse(raw) as typeof fromStorage;
          sessionStorage.removeItem(CHECKOUT_THANK_YOU_META_KEY);
        }
      } catch {
        /* ignore */
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      /** Prefer live session so logged-in users always get “View order history” if storage failed */
      const signedIn = Boolean(user) || fromStorage.signedIn;
      const email =
        fromStorage.email?.trim() || user?.email?.trim() || undefined;
      setMeta({
        email,
        phone: fromStorage.phone?.trim() || undefined,
        firstName: fromStorage.firstName?.trim() || undefined,
        lastName: fromStorage.lastName?.trim() || undefined,
        city: fromStorage.city?.trim() || undefined,
        state: fromStorage.state?.trim() || undefined,
        zip: fromStorage.zip?.trim() || undefined,
        country: fromStorage.country?.trim() || undefined,
        signedIn,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [paramsValid, router]);

  if (!paramsValid) {
    return (
      <CheckoutChrome mode="complete">
        <main
          id="MainContent"
          className="flex min-h-[40vh] items-center justify-center"
        >
          <p className="text-sm text-neutral-500">Redirecting…</p>
        </main>
      </CheckoutChrome>
    );
  }

  if (meta === null) {
    return <ThankYouFallback />;
  }

  return (
    <CheckoutChrome mode="complete">
      <main id="MainContent">
        <OrderConfirmation
          orderNumber={order}
          orderTotalCents={totalCents}
          signedIn={meta.signedIn}
          customerEmail={meta.email?.trim() || undefined}
        />
      </main>
    </CheckoutChrome>
  );
}

export default function CheckoutThankYouPage() {
  return (
    <Suspense fallback={<ThankYouFallback />}>
      <CheckoutThankYouInner />
    </Suspense>
  );
}
