"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import {
  getPublicFacebookUrl,
  getPublicInstagramUrl,
} from "@/lib/env/public-social";

const easeFooter: [number, number, number, number] = [0.22, 1, 0.36, 1];

const policyLinks: { href: string; label: string }[] = [
  { href: "/policies/size-charts", label: "Size Charts" },
  { href: "/policies/about", label: "About us" },
  { href: "/contact", label: "Contact us" },
  { href: "/policies/returns", label: "Returns & Exchanges" },
  { href: "/policies/shipping", label: "Shipping Policy" },
  { href: "/policies/terms", label: "Terms of Service" },
  { href: "/policies/privacy", label: "Privacy Policy" },
];

/** Non-collection links appended after dynamic header nav items (collections). */
const footerExploreExtras: { href: string; label: string }[] = [
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/returns", label: "Returns" },
  { href: "/contact", label: "Contact" },
];

function FooterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 72"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 6 L32 30 L54 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 18 L32 36 L48 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      <path
        d="M22 28 L32 40 L42 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}

function SocialLinks({ className }: { className?: string }) {
  const ig = getPublicInstagramUrl();
  const fb = getPublicFacebookUrl();
  if (!ig && !fb) return null;
  return (
    <div className={className}>
      {ig ? (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 text-white transition hover:bg-white/10"
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
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

function NeedHelpBlock({
  mailto,
  footer,
}: {
  mailto: string;
  footer: { supportEmail: string; phone: string; hoursLine: string };
}) {
  return (
    <div className="space-y-1 text-[15px] leading-relaxed text-white/90">
      <p>Reach us at</p>
      <a
        href={mailto}
        className="block font-semibold tracking-wide text-white underline-offset-4 hover:underline"
      >
        {footer.supportEmail}
      </a>
      <p className="pt-4">
        Call/Whatsapp : <span className="font-semibold text-white">{footer.phone}</span>
      </p>
      <p className="text-white/80">{footer.hoursLine}</p>
    </div>
  );
}

function ExploreLinksList({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <ul className="list-none space-y-2.5 pl-0 text-[15px] text-white/90">
      {links.map((item) => {
        const isSale =
          item.href === "/collections/sale" ||
          item.label.trim().toLowerCase() === "sale";
        return (
          <li key={item.href + item.label}>
            <Link href={item.href} className="transition-colors hover:text-white hover:underline">
              {isSale ? (
                <span className="inline-flex items-center gap-1.5">
                  <SaleBoltIcon className="h-4 w-4 shrink-0 text-amber-400" />
                  {item.label}
                </span>
              ) : (
                item.label
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PolicyLinksList() {
  return (
    <ul className="list-none space-y-2.5 pl-0 text-[15px] text-white/90">
      {policyLinks.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="transition-colors hover:text-white hover:underline">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

type AccordionId = "help" | "explore";

function MobileAccordion({
  id,
  title,
  openId,
  onToggle,
  children,
}: {
  id: AccordionId;
  title: string;
  openId: AccordionId | null;
  onToggle: (id: AccordionId) => void;
  children: ReactNode;
}) {
  const open = openId === id;
  const panelId = `footer-panel-${id}`;

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        id={`footer-trigger-${id}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[12px] font-semibold capitalize tracking-[0.2em] text-white">{title}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: easeFooter }}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-white/90"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 7.5 L10 12.5 L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={`footer-trigger-${id}`}
        initial={false}
        animate={{
          height: open ? "auto" : 0,
        }}
        transition={{ duration: 0.38, ease: easeFooter }}
        className="overflow-hidden"
      >
        <div className="pb-5 pr-1 pt-0">{children}</div>
      </motion.div>
    </div>
  );
}

export function Footer() {
  const { storeName, footer } = useStoreBrand();
  const headerNavItems = useHeaderNavMenuItems();
  const mailto = `mailto:${footer.supportEmail}`;
  const [openId, setOpenId] = useState<AccordionId | null>(null);

  const footerExploreLinks = [
    ...headerNavItems.map((n) => ({ href: n.href, label: n.label })),
    ...footerExploreExtras,
  ];

  const toggle = (id: AccordionId) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="shopify-section-footer" className="shopify-section shopify-section-footer">
      <footer
        className="site-footer bg-black text-white"
        data-section-id="sections--footer"
        data-section-type="footer"
      >
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          {/* Mobile accordions */}
          <div className="border-t border-white/10 lg:hidden">
            <MobileAccordion
              id="help"
              title="Need help?"
              openId={openId}
              onToggle={toggle}
            >
              <NeedHelpBlock mailto={mailto} footer={footer} />
            </MobileAccordion>
            <MobileAccordion id="explore" title="Explore" openId={openId} onToggle={toggle}>
              <ExploreLinksList links={footerExploreLinks} />
            </MobileAccordion>
            {/* Customer care: always visible (not accordion); no divider below before brand row */}
            <div className="py-5">
              <p className="text-[12px] font-semibold capitalize tracking-[0.2em] text-white">
                Customer care
              </p>
              <div className="mt-4">
                <PolicyLinksList />
              </div>
            </div>
          </div>

          {/* Mobile: mark left, social right — no border above this row (reference) */}
          <div className="flex w-full items-center justify-between gap-4 pt-8 lg:hidden">
            <FooterMark className="h-14 w-11 shrink-0 text-white" aria-hidden />
            <SocialLinks className="flex shrink-0 items-center gap-3" />
          </div>

          {/* Desktop 4 columns */}
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-10 xl:gap-14">
            <div>
              <h2 className="text-[12px] font-semibold capitalize tracking-[0.2em] text-white">Need help?</h2>
              <div className="mt-6">
                <NeedHelpBlock mailto={mailto} footer={footer} />
              </div>
            </div>
            <div>
              <h2 className="text-[12px] font-semibold capitalize tracking-[0.2em] text-white">Explore</h2>
              <div className="mt-6">
                <ExploreLinksList links={footerExploreLinks} />
              </div>
            </div>
            <div className="lg:pt-9">
              <h2 className="sr-only">Policies and information</h2>
              <PolicyLinksList />
            </div>
            <div className="flex flex-col items-center text-center">
              <FooterMark className="mx-auto h-20 w-16 text-white" />
              <SocialLinks className="mt-8 flex items-center justify-center gap-4" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-5 text-center text-[11px] leading-relaxed text-white/55 sm:px-6 lg:px-8">
            © {new Date().getFullYear()}{" "}
            <Link href="/" className="text-white/70 underline-offset-2 transition hover:text-white hover:underline">
              {storeName}
            </Link>{" "}
            All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
