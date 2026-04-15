"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";

const accordionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function ChevronDown({ open }: { open: boolean }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-neutral-900"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.32, ease: accordionEase }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function DrawerSocialIcons() {
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/";
  const fb = process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com/";
  const iconBtn =
    "flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50";

  return (
    <div className="flex gap-4">
      <a
        href={ig}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBtn}
        aria-label="Instagram"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBtn}
        aria-label="Facebook"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M13.5 22v-8.2h2.7l.5-3.2H13.5V8.9c0-.9.3-1.5 1.6-1.5H17V4.4c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.6H7v3.2h2.8V22h3.7z" />
        </svg>
      </a>
    </div>
  );
}

const itemClass =
  "block w-full border-b border-neutral-200 px-4 py-5 text-sm font-normal text-neutral-950 transition-colors hover:bg-neutral-50";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: Props) {
  const links = useNavCollections();
  const [shopOpen, setShopOpen] = useState(false);

  useEffect(() => {
    if (!open) setShopOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-120 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={onClose}
          />
          <motion.nav
            className="absolute left-0 top-0 flex h-dvh max-h-dvh w-[min(90vw,360px)] flex-col overflow-y-auto bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex shrink-0 justify-end border-b border-neutral-200 px-3 py-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-900 hover:bg-neutral-100"
                onClick={onClose}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="border-b border-neutral-200">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-5 text-left text-sm font-normal text-neutral-950 hover:bg-neutral-50"
                aria-expanded={shopOpen}
                onClick={() => setShopOpen((o) => !o)}
              >
                <span>Shop</span>
                <ChevronDown open={shopOpen} />
              </button>
              <AnimatePresence initial={false}>
                {shopOpen ? (
                  <motion.div
                    key="shop-accordion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.36, ease: accordionEase }}
                    className="overflow-hidden border-t border-neutral-100"
                  >
                    <motion.div
                      initial={{ y: -6 }}
                      animate={{ y: 0 }}
                      exit={{ y: -4 }}
                      transition={{ duration: 0.28, ease: accordionEase }}
                      className="bg-neutral-50/90 px-4 py-2"
                    >
                      <Link
                        href="/collections"
                        className="block py-3 text-sm font-normal text-neutral-900"
                        onClick={onClose}
                      >
                        All collections
                      </Link>
                      {links.length === 0 ? (
                        <p className="py-2 text-sm text-neutral-500">No collections yet.</p>
                      ) : (
                        <ul className="list-none space-y-0 pb-2 pl-0">
                          {links.map((l) => (
                            <li key={l.slug}>
                              <Link
                                href={`/collections/${l.slug}`}
                                className="block wrap-break-word py-3 text-sm font-normal text-neutral-800"
                                onClick={onClose}
                              >
                                {l.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <Link
              href="/collections/sale"
              className={`${itemClass} inline-flex items-center gap-2`}
              onClick={onClose}
            >
              <SaleBoltIcon className="h-5 w-5 shrink-0" />
              Sale
            </Link>
            <Link href="/bundles" className={itemClass} onClick={onClose}>
              <span aria-hidden className="mr-1.5">
                🔥
              </span>
              Bundle Deals
            </Link>
            <Link href="/login" className={itemClass} onClick={onClose}>
              Log in
            </Link>

            <div className="mt-auto border-t border-neutral-200 px-4 py-5">
              <DrawerSocialIcons />
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
