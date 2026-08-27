"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RiseUpTitleProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Category title appear — always visible (no overflow clip / opacity:0).
 * CSS + IntersectionObserver — no framer-motion on the home critical path.
 */
export function RiseUpTitle({ children, className }: RiseUpTitleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 10% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: shown ? "translateY(0)" : "translateY(28px)",
        transition: shown
          ? "transform 0.85s cubic-bezier(0.26, 0.54, 0.32, 1)"
          : undefined,
        willChange: shown ? undefined : "transform",
      }}
    >
      {children}
    </div>
  );
}
