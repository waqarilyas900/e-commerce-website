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
import { SiteLogoFull } from "@/components/site-logo";

const easeFooter: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Always shown in Customer care; not editable from admin. Footer-only (not header). */
const CONTACT_US_HREF = "/contact";
const CONTACT_US_LABEL = "Contact us";
const ABOUT_US_HREF = "/about";
const ABOUT_US_LABEL = "About us";
const HOW_TO_BUY_HREF = "/how-to-buy";
const HOW_TO_BUY_LABEL = "How to Buy";
const BLOGS_HREF = "/blogs";
const BLOGS_LABEL = "SimpleCart Blogs";
const PURCHASE_PROTECTION_HREF = "/purchase-protection";
const PURCHASE_PROTECTION_LABEL = "Purchase Protection";
const TERMS_HREF = "/terms";
const TERMS_LABEL = "Terms & Conditions";

const HARDCODED_CUSTOMER_CARE_PATHS = [
  CONTACT_US_HREF,
  ABOUT_US_HREF,
  HOW_TO_BUY_HREF,
  BLOGS_HREF,
  PURCHASE_PROTECTION_HREF,
  TERMS_HREF,
] as const;

/** Stable shop links for footer SEO internal linking. */
const FOOTER_SHOP_LINKS: { href: string; label: string }[] = [
  { href: "/collections", label: "All collections" },
  { href: "/collections/drinkware", label: "Water bottles & tumblers" },
  { href: "/collections/kitchen", label: "Kitchen tools" },
  { href: "/collections/appliances", label: "Home appliances" },
  { href: "/collections/beauty", label: "Beauty tools" },
  { href: "/collections/lighting", label: "Lamps & lights" },
  { href: "/collections/pest-control", label: "Pest control" },
  { href: "/collections/wellness", label: "Wellness" },
  { href: "/collections/home", label: "Home essentials" },
];

function normalizeFooterPath(href: string): string {
  let path = href.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function customerCareReservedPaths(policyRows: { href: string }[]): Set<string> {
  const s = new Set<string>(
    HARDCODED_CUSTOMER_CARE_PATHS.map((p) => normalizeFooterPath(p)),
  );
  for (const p of policyRows) {
    const h = p.href?.trim() ?? "";
    if (h.startsWith("/") && !h.startsWith("//")) {
      s.add(normalizeFooterPath(h));
    }
  }
  return s;
}

/**
 * Explore = header nav only, minus URLs already used under Customer care
 * (Contact us + admin policy links).
 */
function buildFooterExploreLinks(
  headerItems: { href: string; label: string }[],
  reservedPaths: Set<string>,
): { href: string; label: string }[] {
  const seen = new Set<string>();
  const out: { href: string; label: string }[] = [];
  for (const item of headerItems) {
    const path = normalizeFooterPath(item.href);
    if (!path || reservedPaths.has(path) || seen.has(path)) continue;
    seen.add(path);
    out.push({ href: path, label: item.label });
  }
  return out;
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
    <div className="space-y-2 text-[15px] leading-relaxed text-white/85">
      <p className="text-sm text-white/70">Reach us at</p>
      <a
        href={mailto}
        className="block break-all font-semibold tracking-wide text-white underline-offset-4 transition hover:underline"
      >
        {footer.supportEmail}
      </a>
      <p className="pt-3 text-white/85">
        Call / WhatsApp: <span className="font-semibold text-white">{footer.phone}</span>
      </p>
      {footer.hoursLine?.trim() ? (
        <p className="text-sm leading-relaxed text-white/65">{footer.hoursLine}</p>
      ) : null}
    </div>
  );
}

function ExploreLinksList({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <ul className="list-none space-y-3 pl-0 text-[15px] leading-snug text-white/88">
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

const policyLinkClass =
  "underline decoration-white/35 underline-offset-4 transition-colors hover:text-white hover:decoration-white";

function PolicyNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http://") || href.startsWith("https://");
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={policyLinkClass}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={policyLinkClass}>
      {children}
    </Link>
  );
}

function PolicyLinksList({ policyRows }: { policyRows: { label: string; href: string }[] }) {
  const hardcoded = [
    { key: "__contact-us", href: CONTACT_US_HREF, label: CONTACT_US_LABEL },
    { key: "__about-us", href: ABOUT_US_HREF, label: ABOUT_US_LABEL },
    { key: "__how-to-buy", href: HOW_TO_BUY_HREF, label: HOW_TO_BUY_LABEL },
    { key: "__blogs", href: BLOGS_HREF, label: BLOGS_LABEL },
    {
      key: "__purchase-protection",
      href: PURCHASE_PROTECTION_HREF,
      label: PURCHASE_PROTECTION_LABEL,
    },
    { key: "__terms", href: TERMS_HREF, label: TERMS_LABEL },
  ];
  const reserved = new Set(
    HARDCODED_CUSTOMER_CARE_PATHS.map((p) => normalizeFooterPath(p)),
  );
  return (
    <ul className="list-none space-y-3 pl-0 text-[15px] leading-snug text-white/88">
      {hardcoded.map((item) => (
        <li key={item.key}>
          <Link href={item.href} className={policyLinkClass}>
            {item.label}
          </Link>
        </li>
      ))}
      {policyRows.map((item) => {
        const path = normalizeFooterPath(item.href);
        if (reserved.has(path)) return null;
        return (
          <li key={item.href + item.label}>
            <PolicyNavLink href={item.href}>{item.label}</PolicyNavLink>
          </li>
        );
      })}
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
    <div className="min-w-0">
      <button
        type="button"
        id={`footer-trigger-${id}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
        className="touch-manipulation flex min-h-[52px] w-full items-center justify-between gap-4 py-3 text-left transition-colors active:bg-white/6 lg:active:bg-transparent"
      >
        <span className="text-[15px] font-semibold tracking-wide text-white">{title}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: easeFooter }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/90"
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
        <div className="border-t border-white/8 pb-6 pl-0 pr-0 pt-4">{children}</div>
      </motion.div>
    </div>
  );
}

export function Footer() {
  const { storeName, footer } = useStoreBrand();
  const headerNavItems = useHeaderNavMenuItems();
  const mailto = `mailto:${footer.supportEmail}`;
  const [openId, setOpenId] = useState<AccordionId | null>(null);

  const customerCareTitle = footer.customerCareSectionTitle.trim() || "Customer care";
  const policyRows = footer.policyFooterLinks;
  const reservedPaths = customerCareReservedPaths(policyRows);

  const footerExploreLinks = (() => {
    const fromNav = buildFooterExploreLinks(
      headerNavItems.map((n) => ({ href: n.href, label: n.label })),
      reservedPaths,
    );
    const seen = new Set<string>();
    const out: { href: string; label: string }[] = [];
    for (const item of [...FOOTER_SHOP_LINKS, ...fromNav]) {
      const path = normalizeFooterPath(item.href);
      if (!path || reservedPaths.has(path) || seen.has(path)) continue;
      seen.add(path);
      out.push({ href: path, label: item.label });
    }
    return out;
  })();
  const hasExploreLinks = footerExploreLinks.length > 0;

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
        <div className="mx-auto max-w-7xl shell-x pb-10 pt-12 sm:pb-12 sm:pt-12 lg:py-14">
          {/* Mobile: clear sections + comfortable tap targets */}
          <div className="border-t border-white/12 lg:hidden">
            <div className="divide-y divide-white/10">
              <MobileAccordion
                id="help"
                title="Need help?"
                openId={openId}
                onToggle={toggle}
              >
                <NeedHelpBlock mailto={mailto} footer={footer} />
              </MobileAccordion>
              {hasExploreLinks ? (
                <MobileAccordion id="explore" title="Explore" openId={openId} onToggle={toggle}>
                  <ExploreLinksList links={footerExploreLinks} />
                </MobileAccordion>
              ) : null}
              <div className="py-6">
                <h2 className="text-[15px] font-semibold tracking-wide text-white">{customerCareTitle}</h2>
                <div className="mt-5">
                  <PolicyLinksList policyRows={policyRows} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-6 border-t border-white/12 pt-10 lg:hidden">
            <div className="min-w-0">
              <p className="sr-only">{storeName}</p>
              <SiteLogoFull />
            </div>
            <SocialLinks className="flex shrink-0 items-center gap-2.5 sm:gap-3" />
          </div>

          {/* Desktop: aligned 4-column grid — same heading rhythm and left edge */}
          <div className="hidden border-t border-white/10 pt-12 lg:block">
            <div
              className={
                hasExploreLinks
                  ? "grid grid-cols-4 items-start gap-10 xl:gap-14"
                  : "grid grid-cols-3 items-start gap-10 xl:gap-14"
              }
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Need help?</h2>
                <div className="mt-6">
                  <NeedHelpBlock mailto={mailto} footer={footer} />
                </div>
              </div>
              {hasExploreLinks ? (
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">Explore</h2>
                  <div className="mt-6">
                    <ExploreLinksList links={footerExploreLinks} />
                  </div>
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">{customerCareTitle}</h2>
                <div className="mt-6">
                  <PolicyLinksList policyRows={policyRows} />
                </div>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-6 border-l border-white/10 pl-10 xl:pl-14">
                <SiteLogoFull className="shrink-0" />
                <SocialLinks className="flex flex-wrap items-center gap-3" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/12 bg-black">
          <div className="mx-auto max-w-7xl shell-x py-5 text-center text-xs leading-relaxed tracking-wide text-white/50 sm:py-4 lg:text-left">
            © {new Date().getFullYear()}{" "}
            <Link href="/" className="text-white/65 underline-offset-2 transition hover:text-white hover:underline">
              {storeName}
            </Link>
            . All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
