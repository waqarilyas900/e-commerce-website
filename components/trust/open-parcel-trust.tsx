import React from "react";

/**
 * Clean SVG icons (Zero emojis as per high-end brand standard)
 */
function PackageCheckIcon({ className = "w-5 h-5 text-neutral-900" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m16 16 2 2 4-4" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-5 h-5 text-neutral-900" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CashDeliveryIcon({ className = "w-5 h-5 text-neutral-900" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function RefreshIcon({ className = "w-5 h-5 text-neutral-900" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

/**
 * Product Detail Page (PDP) Trust & Open Parcel Guarantee Box
 */
export function OpenParcelPDPBadge() {
  return (
    <div className="my-5 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/40 p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
          <PackageCheckIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Open Parcel Allowed
            </span>
            <span className="text-xs font-semibold text-emerald-950">
              100% Customer Trust Guarantee
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-neutral-800 sm:text-sm">
            Parcel pehle khol kar tasalli se check karein, mukammal check karne ke baad courier rider ko payment dein.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-emerald-600/20 pt-3.5 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>Check Before Paying</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
          <CashDeliveryIcon className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>Cash on Delivery</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
          <RefreshIcon className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>7-Day Replacement</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart Drawer Open Parcel Pill / Micro Notice
 */
export function OpenParcelCartPill() {
  return (
    <div className="my-3 flex items-center gap-2.5 rounded-lg border border-emerald-600/25 bg-emerald-50/60 px-3 py-2 text-xs text-neutral-800">
      <PackageCheckIcon className="h-4 w-4 shrink-0 text-emerald-700" />
      <p className="leading-snug">
        <strong className="font-semibold text-emerald-950">Open Parcel Allowed:</strong> Pehle parcel check karein, phir cash payment dein.
      </p>
    </div>
  );
}

/**
 * Checkout Page Payment Trust Card
 */
export function OpenParcelCheckoutNotice() {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-emerald-600/30 bg-emerald-50/50 p-3.5 text-xs text-neutral-800">
      <PackageCheckIcon className="h-5 w-5 shrink-0 text-emerald-700" />
      <div className="space-y-0.5">
        <p className="font-bold text-emerald-950 text-xs sm:text-sm">
          Open Parcel Delivery Guaranteed
        </p>
        <p className="leading-relaxed text-neutral-700">
          Aapka parcel safe packing mein aayega. Courier rider ke samne parcel khol kar check karein aur tassalli ke baad payment karein.
        </p>
      </div>
    </div>
  );
}

/**
 * Storefront Footer Trust Bar (4 Core Value Pillars)
 */
export function StorefrontTrustBar() {
  const pillars = [
    {
      icon: PackageCheckIcon,
      title: "Open Parcel Allowed",
      subtitle: "Pehle parcel check karein, phir payment karein",
    },
    {
      icon: CashDeliveryIcon,
      title: "Nationwide COD",
      subtitle: "Fast cash on delivery in 400+ cities",
    },
    {
      icon: RefreshIcon,
      title: "7-Day Replacement",
      subtitle: "Full purchase & damage protection",
    },
    {
      icon: ShieldCheckIcon,
      title: "100% Quality Checked",
      subtitle: "Inspected before dispatch from warehouse",
    },
  ];

  return (
    <section
      className="border-y border-neutral-200 bg-neutral-50/80 py-8"
      aria-label="Store Guarantees"
    >
      <div className="mx-auto max-w-7xl shell-x">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-neutral-950">
                    {pillar.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-600 leading-snug">
                    {pillar.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
