"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FaqItem } from "@/lib/seo/jsonld/faq";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Visible FAQ block — keep questions identical to FAQPage JSON-LD.
 * Accordion open/close (one or more items can be open).
 */
export function StoreFaqSection({
  heading = "Frequently asked questions",
  items,
  className = "",
}: {
  heading?: string;
  items: FaqItem[];
  className?: string;
}) {
  const list = items.filter((i) => i.question.trim() && i.answer.trim());
  const baseId = useId().replace(/:/g, "");
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  if (list.length === 0) return null;

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section
      className={`mt-8 border-t border-neutral-200 pt-6 sm:mt-10 sm:pt-8 ${className}`.trim()}
      aria-labelledby={`${baseId}-faq-heading`}
    >
      <h2
        id={`${baseId}-faq-heading`}
        className="text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl"
      >
        {heading}
      </h2>
      <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {list.map((item, index) => {
          const key = `${index}-${item.question}`;
          const open = openKeys.has(key);
          const panelId = `${baseId}-panel-${index}`;
          const triggerId = `${baseId}-trigger-${index}`;
          return (
            <div key={key} className="min-w-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 sm:px-5 sm:py-4"
              >
                <span className="text-sm font-semibold text-neutral-900 sm:text-[15px]">
                  {item.question}
                </span>
                <motion.span
                  aria-hidden
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.28, ease }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 7.5 L10 12.5 L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-neutral-600 sm:px-5 sm:pb-5 sm:text-[15px]">
                      {item.answer}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
