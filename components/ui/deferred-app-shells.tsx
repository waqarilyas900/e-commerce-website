"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const DiscountNotificationPrompt = dynamic(
  () =>
    import("@/components/ui/discount-notification-prompt").then(
      (m) => m.DiscountNotificationPrompt,
    ),
  { ssr: false },
);

const AskTheStore = dynamic(
  () => import("@/components/ask-the-store/ask-the-store").then((m) => m.AskTheStore),
  { ssr: false },
);

/**
 * Mounts heavy "after the page is usable" client widgets only once the browser
 * is idle. This keeps the discount popup, AI assistant, and their dependencies
 * (framer-motion, large icon sets, etc.) out of the initial JS that the main
 * thread has to parse before First Input Delay / TBT settle.
 *
 * Visually identical to mounting them immediately because both widgets only
 * render after their own internal triggers (timer / button click).
 */
export function DeferredAppShells() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    type IdleCb = (cb: () => void) => number;
    const ric = (window as unknown as { requestIdleCallback?: IdleCb })
      .requestIdleCallback;
    const handle = ric
      ? ric(() => setReady(true))
      : window.setTimeout(() => setReady(true), 1500);
    return () => {
      const cic = (
        window as unknown as { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      if (cic) cic(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <DiscountNotificationPrompt />
      <AskTheStore />
    </>
  );
}
