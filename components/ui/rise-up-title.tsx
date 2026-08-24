"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RiseUpTitleProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Category title appear — always visible (no overflow clip).
 * Soft rise like radstore section text, without hiding the label if IO stalls.
 */
export function RiseUpTitle({ children, className }: RiseUpTitleProps) {
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform" }}
      initial={{ y: 28 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0, margin: "0px 0px 10% 0px" }}
      transition={{
        duration: 0.85,
        ease: [0.26, 0.54, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
