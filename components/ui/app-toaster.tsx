"use client";

import { Toaster } from "sonner";

import "sonner/dist/styles.css";

/**
 * Single global toaster — top-right. Uses concrete Tailwind classes so toasts
 * always render (arbitrary `var(--*)` classes can be dropped by the compiler
 * when not detected as used).
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      richColors
      offset={16}
      gap={10}
      closeButton
      style={{ zIndex: 2147483647 }}
      className="font-sans"
      toastOptions={{
        classNames: {
          toast:
            "group border border-zinc-200 bg-white text-zinc-900 shadow-lg !text-zinc-900",
          title: "font-semibold !text-zinc-900",
          description: "!text-zinc-600",
          success: "!border-emerald-200",
          error: "!border-red-200",
          loading: "!border-zinc-200",
        },
      }}
    />
  );
}
