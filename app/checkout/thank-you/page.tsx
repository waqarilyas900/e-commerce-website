"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutChrome } from "@/components/checkout/checkout-chrome";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { CHECKOUT_THANK_YOU_META_KEY } from "@/app/lib/checkout-thank-you";
import { createClient } from "@/lib/supabase/client";

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
    signedIn: boolean;
  } | null>(null);

  useEffect(() => {
    if (!paramsValid) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      let fromStorage: { email?: string; signedIn: boolean } = { signedIn: false };
      try {
        const raw = sessionStorage.getItem(CHECKOUT_THANK_YOU_META_KEY);
        if (raw) {
          fromStorage = JSON.parse(raw) as { email?: string; signedIn: boolean };
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
