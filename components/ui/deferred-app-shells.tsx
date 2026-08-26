"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

function isCheckoutPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

const DiscountNotificationPrompt = dynamic(
  () =>
    import("@/components/ui/discount-notification-prompt").then(
      (m) => m.DiscountNotificationPrompt,
    ),
  { ssr: false },
);

/**
 * Mounts heavy "after the page is usable" client widgets only once the browser
 * is idle (discount popup), so they stay off the LCP / TBT path.
 */
export function DeferredAppShells() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    type IdleCb = (cb: () => void) => number;
    const ric = (window as unknown as { requestIdleCallback?: IdleCb })
      .requestIdleCallback;
    const handle = ric
      ? ric(() => setReady(true))
      : window.setTimeout(() => setReady(true), 2500);
    return () => {
      const cic = (
        window as unknown as { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      if (cic) cic(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, []);

  if (!ready) return null;

  const hideDiscountPrompt = isCheckoutPath(pathname);

  return <>{hideDiscountPrompt ? null : <DiscountNotificationPrompt />}</>;
}
