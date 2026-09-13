"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/**
 * Lightweight one-time section reveal without framer-motion.
 * Keeps SSR content visible (no opacity:0); only translates on first view.
 * Honors prefers-reduced-motion (no transform animation).
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 18,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const skipMotion = reduceMotion || shown;

  return (
    <div
      ref={ref}
      className={className}
      style={
        reduceMotion
          ? undefined
          : {
              transform: shown ? "translateY(0)" : `translateY(${y}px)`,
              transition: shown
                ? `transform 0.75s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`
                : undefined,
              willChange: skipMotion ? undefined : "transform",
            }
      }
    >
      {children}
    </div>
  );
}
