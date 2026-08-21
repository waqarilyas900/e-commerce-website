"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { SiteLogoMark } from "@/components/site-logo";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import { useScrollLock } from "@/lib/scroll-lock";
import { createClient } from "@/lib/supabase/client";
import {
  getPublicFacebookUrl,
  getPublicInstagramUrl,
} from "@/lib/env/public-social";

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
  const ig = getPublicInstagramUrl();
  const fb = getPublicFacebookUrl();
  if (!ig && !fb) return null;
  const iconBtn =
    "flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50";

  return (
    <div className="flex gap-4">
      {ig ? (
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
      ) : null}
      {fb ? (
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
      ) : null}
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
  const headerNavItems = useHeaderNavMenuItems();
  const { storeName } = useStoreBrand();
  const pathname = usePathname();
  const [shopOpen, setShopOpen] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const routeActive =
    pathname === "/collections" || Boolean(pathname?.startsWith("/collections/"));
  const shopSelected = shopOpen || routeActive;

  useScrollLock(open);

  useEffect(() => {
    if (open) queueMicrotask(() => setShopOpen(true));
  }, [open]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setAuthUser(session?.user ?? null);
      });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setAuthUser(nextSession?.user ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {}
    return () => unsubscribe?.();
  }, []);

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
          className="fixed inset-0 z-170 lg:hidden"
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
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-3">
              <Link
                href="/"
                onClick={onClose}
                aria-label={`${storeName} home`}
                className="inline-flex min-w-0 items-center rounded-md px-1 py-1"
              >
                <SiteLogoMark size="compact" />
              </Link>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-900 hover:bg-neutral-100"
                onClick={onClose}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              className={`border-b border-neutral-200 ${
                shopSelected ? "bg-neutral-50" : ""
              }`}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors ${
                  shopSelected
                    ? "bg-neutral-100 ring-1 ring-inset ring-neutral-200"
                    : "hover:bg-neutral-50"
                }`}
                aria-expanded={shopOpen}
                aria-current={routeActive ? "true" : undefined}
                onClick={() => setShopOpen((o) => !o)}
              >
                <span className="min-w-0">
                  <span
                    className={`block text-[15px] tracking-tight ${
                      shopSelected
                        ? "font-bold text-neutral-950"
                        : "font-semibold text-neutral-950"
                    }`}
                  >
                    Shop
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {shopSelected ? "Selected · Browse collections" : "Browse collections"}
                  </span>
                </span>
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
                    className="overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: -6 }}
                      animate={{ y: 0 }}
                      exit={{ y: -4 }}
                      transition={{ duration: 0.28, ease: accordionEase }}
                      className="border-t border-neutral-100 bg-neutral-50/80 px-3 pb-3 pt-2"
                    >
                      <Link
                        href="/collections"
                        aria-current={pathname === "/collections" ? "page" : undefined}
                        className={`mb-1.5 flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium shadow-sm ring-1 transition ${
                          pathname === "/collections"
                            ? "bg-neutral-950 text-white ring-neutral-950"
                            : "bg-white text-neutral-950 ring-neutral-200/80 hover:ring-neutral-300"
                        }`}
                        onClick={onClose}
                      >
                        All collections
                        <span
                          className={
                            pathname === "/collections" ? "text-white/70" : "text-neutral-400"
                          }
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                      {links.length === 0 ? (
                        <p className="px-1 py-3 text-sm text-neutral-500">
                          No collections yet.
                        </p>
                      ) : (
                        <ul className="mt-1 list-none space-y-0.5 pl-0">
                          {links.map((l) => {
                            const itemActive = pathname === `/collections/${l.slug}`;
                            return (
                              <li key={l.slug}>
                                <Link
                                  href={`/collections/${l.slug}`}
                                  aria-current={itemActive ? "page" : undefined}
                                  className={`block rounded-lg px-3.5 py-2.5 text-sm transition ${
                                    itemActive
                                      ? "bg-white font-semibold text-neutral-950 shadow-sm ring-1 ring-neutral-200"
                                      : "font-normal text-neutral-800 hover:bg-white hover:text-neutral-950"
                                  }`}
                                  onClick={onClose}
                                >
                                  {l.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {headerNavItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`${itemClass} inline-flex items-center gap-2`}
                onClick={onClose}
              >
                {item.slug === "sale" ? (
                  <SaleBoltIcon className="h-5 w-5 shrink-0" aria-hidden />
                ) : null}
                {item.label}
              </Link>
            ))}
            {!authUser ? (
              <Link href="/login" className={itemClass} onClick={onClose}>
                Log in
              </Link>
            ) : null}

            <div className="mt-auto border-t border-neutral-200 px-4 py-5">
              <DrawerSocialIcons />
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
