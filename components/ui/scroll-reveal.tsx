"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/**
 * Smooth one-time section reveal as content enters viewport.
 *
 * Important: we deliberately do NOT include `opacity: 0` in `initial`. The
 * server-rendered HTML must be visible even if framer-motion's hydration or
 * IntersectionObserver fails to fire (e.g. third-party script breaking
 * hydration, browser without IO support, very short viewports failing the
 * `amount` threshold). A small y-translation is a safe progressive
 * enhancement — if the animation never runs, content sits 18px lower but
 * stays fully visible. Hiding content behind opacity used to leave the
 * whole page blank when hydration stalled.
 */
export function ScrollReveal({ children, className, delay = 0, y = 18 }: RevealProps) {
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform" }}
      initial={{ y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0, margin: "0px 0px 10% 0px" }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
