"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { SiteLogoMark } from "@/components/site-logo";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import { useScrollLock } from "@/lib/scroll-lock";
import { SocialIconLinks } from "@/components/social-icon-links";
import {
  avatarInitialsFromUser,
  avatarPhotoUrlFromUser,
  displayNameFromUser,
} from "@/lib/auth/user-display-name";

const accordionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-neutral-400"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.22, ease: accordionEase }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function GridIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="7" height="7" x="3" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="14" rx="1.5" />
      <rect width="7" height="7" x="3" y="14" rx="1.5" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.04 2.01c-5.5 0-9.96 4.45-9.96 9.94 0 1.75.46 3.45 1.33 4.95L2 22l5.27-1.38a9.93 9.93 0 0 0 4.77 1.22h.01c5.49 0 9.95-4.46 9.95-9.95 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0 0 12.04 2zm0 18.18h-.01a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.23 8.23 0 0 1-1.26-4.4c0-4.55 3.71-8.25 8.27-8.25 2.21 0 4.28.86 5.84 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.55-3.71 8.27-8.27 8.27zm4.53-6.18c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.24-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74 1.49.64 2.07.7 2.81.59.43-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CategoryGlyph({ slug }: { slug: string }) {
  const s = slug.toLowerCase();
  if (s.includes("bottle") || s.includes("tumbler") || s.includes("drink")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 2h10v3H7z" />
        <path d="M8 5v2a4 4 0 0 0 1 2.83V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9.83A4 4 0 0 0 16 7V5" />
      </svg>
    );
  }
  if (s.includes("kitchen") || s.includes("cutlery") || s.includes("cook")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 2v20M21 15V2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3zM3 2v6a3 3 0 0 0 3 3v11M6 2v20" />
      </svg>
    );
  }
  if (s.includes("appliance") || s.includes("electric") || s.includes("heater")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="15" y2="6" />
        <circle cx="12" cy="14" r="3" />
      </svg>
    );
  }
  if (s.includes("lamp") || s.includes("light")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6M10 22h4" />
      </svg>
    );
  }
  if (s.includes("beauty") || s.includes("care") || s.includes("personal")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    );
  }
  if (s.includes("pest") || s.includes("mosquito")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="6" />
        <path d="m18 12 3-3M6 12 3 9M18 12l3 3M6 12l-3 3M12 6V3M12 18v3" />
      </svg>
    );
  }
  return <GridIcon className="h-4 w-4" />;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: Props) {
  const collections = useNavCollections();
  const headerNavItems = useHeaderNavMenuItems();
  const { storeName, footer } = useStoreBrand();
  const pathname = usePathname();
  const { user: authUser, nameProfile, signOut } = useAuth();
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const userName = authUser
    ? displayNameFromUser(authUser, nameProfile)
    : "";
  const userInitials = authUser
    ? avatarInitialsFromUser(authUser, nameProfile)
    : "";
  const avatarUrl = authUser ? avatarPhotoUrlFromUser(authUser) : null;

  // Clean Phone & WhatsApp numbers
  const rawPhone = footer.phone || "03001234567";
  const cleanPhone = rawPhone.replace(/\D+/g, "");
  const telUrl = `tel:${rawPhone.replace(/\s+/g, "")}`;
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("92") ? cleanPhone : cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : `92${cleanPhone}`}?text=${encodeURIComponent(`Hi ${storeName}, I have a question about an order / product.`)}`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-170 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop with smooth blur */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
            aria-label="Close navigation"
            onClick={onClose}
          />

          {/* Drawer Sidebar */}
          <motion.nav
            className="absolute left-0 top-0 flex h-dvh max-h-dvh w-[min(88vw,340px)] flex-col bg-white shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
          >
            {/* 1. Header: Clean Logo & Close button */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 bg-white px-4 py-3.5">
              <Link
                href="/"
                onClick={onClose}
                aria-label={`${storeName} home`}
                className="inline-flex min-w-0 items-center transition hover:opacity-90"
              >
                <SiteLogoMark size="compact" />
              </Link>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 active:scale-95"
                onClick={onClose}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            {/* 2. User Account Card */}
            <div className="shrink-0 border-b border-neutral-100 bg-neutral-50/70 px-4 py-3">
              {authUser ? (
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex min-w-0 items-center gap-2.5 text-neutral-900 transition hover:opacity-80"
                  >
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-950 text-xs font-bold text-white ring-2 ring-white shadow-xs">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={userName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{userInitials || "U"}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-neutral-900">{userName || "My Account"}</p>
                      <p className="truncate text-[10px] text-neutral-500">{authUser.email}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                      onClose();
                    }}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 transition hover:text-[#E0703A]"
                  >
                    <UserIcon className="h-4 w-4 text-neutral-500" />
                    <span>Sign In / Register</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={onClose}
                    className="rounded-full bg-neutral-200/60 px-2.5 py-1 text-[11px] font-medium text-neutral-700 transition hover:bg-neutral-300/70"
                  >
                    Track Order
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
              {/* Primary Pages */}
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition ${
                    pathname === "/"
                      ? "bg-orange-50 font-bold text-[#E0703A]"
                      : "text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  <span>Home</span>
                </Link>

                {headerNavItems.map((item) => {
                  const isSale = item.slug === "sale" || /sale|deal/i.test(item.label);
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition ${
                        active
                          ? "bg-orange-50 font-bold text-[#E0703A]"
                          : isSale
                          ? "bg-red-50/60 font-semibold text-red-600 hover:bg-red-50"
                          : "text-neutral-900 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isSale ? (
                          <SaleBoltIcon className="h-4 w-4 shrink-0 text-red-500" />
                        ) : null}
                        <span>{item.label}</span>
                      </span>
                      {isSale ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Sale
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              {/* Collapsible Categories Section */}
              <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/50">
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-[13px] font-bold tracking-tight text-neutral-900 transition hover:bg-white/60"
                >
                  <span className="flex items-center gap-2">
                    <GridIcon className="h-4 w-4 text-neutral-500" />
                    <span>Shop by Category</span>
                    <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                      {collections.length}
                    </span>
                  </span>
                  <ChevronDown open={categoriesOpen} />
                </button>

                <AnimatePresence initial={false}>
                  {categoriesOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: accordionEase }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 border-t border-neutral-100 p-2">
                        <Link
                          href="/collections"
                          onClick={onClose}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                            pathname === "/collections"
                              ? "bg-neutral-950 text-white"
                              : "bg-white text-neutral-900 shadow-2xs hover:bg-neutral-100"
                          }`}
                        >
                          <span>View All Collections</span>
                          <ArrowRightIcon className="h-3.5 w-3.5 opacity-70" />
                        </Link>

                        {collections.map((c) => {
                          const active = pathname === `/collections/${c.slug}`;
                          return (
                            <Link
                              key={c.slug}
                              href={`/collections/${c.slug}`}
                              onClick={onClose}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition ${
                                active
                                  ? "bg-orange-50 font-bold text-[#E0703A] ring-1 ring-orange-200/80"
                                  : "font-medium text-neutral-700 hover:bg-white hover:text-neutral-950"
                              }`}
                            >
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                                active ? "bg-[#E0703A] text-white" : "bg-neutral-200/60 text-neutral-600"
                              }`}>
                                <CategoryGlyph slug={c.slug} />
                              </span>
                              <span className="truncate">{c.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Direct Call & WhatsApp Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={telUrl}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300/80 bg-white py-2.5 text-xs font-bold text-neutral-900 shadow-2xs transition hover:bg-neutral-100 hover:border-neutral-400 active:scale-98"
                >
                  <PhoneIcon className="h-4 w-4 text-neutral-700" />
                  <span>Call Us</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#20ba5a] active:scale-98"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* 4. Footer */}
            <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                  <span>🇵🇰</span>
                  <span>PKR · Pakistan</span>
                </div>
                <SocialIconLinks
                  className="gap-1.5"
                  iconClassName="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                />
              </div>
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
