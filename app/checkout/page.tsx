"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHECKOUT_THANK_YOU_META_KEY } from "@/app/lib/checkout-thank-you";
// Alternate layout: import `GUEST_MINIMAL_CHECKOUT` from `@/app/lib/checkout-templates` and assign below.
import { PAKISTAN_STANDARD_CHECKOUT } from "@/app/lib/checkout-templates";
import { PAKISTAN_PROVINCE_OPTIONS } from "@/app/lib/checkout-templates/pakistan-provinces";
import { formatPkr, STORE_CURRENCY_CODE } from "@/app/lib/format-currency";
import { CheckoutChrome } from "@/components/checkout/checkout-chrome";
import {
  CheckoutOrderSummaryAccordion,
  CheckoutOrderSummaryPanel,
  CheckoutPolicyFooterLinks,
} from "@/components/checkout/checkout-order-summary-accordion";
import { CheckoutTemplateFields } from "@/components/checkout/checkout-template-fields";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/app/providers/cart-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";

const CHECKOUT_TEMPLATE = PAKISTAN_STANDARD_CHECKOUT;

/** Flat delivery fee in PKR (matches server `place_order` shipping in paisa). */
const DELIVERY_CHARGE = 500;

/** ISO 3166-1 alpha-2 — must match `place_order` (Pakistan-only storefront). */
const SHIPPING_COUNTRY_CODE = "PK";

function readNames(meta: Record<string, unknown>) {
  const first = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  return { first, last };
}

function mapStateToProvince(state: string | undefined): string {
  if (!state) return "";
  const s = state.toLowerCase();
  if (s.includes("punjab")) return "Punjab";
  if (s.includes("sindh")) return "Sindh";
  if (s.includes("khyber") || s.includes("kpk")) return "Khyber Pakhtunkhwa";
  if (s.includes("baloch")) return "Balochistan";
  if (s.includes("islamabad")) return "Islamabad Capital Territory";
  if (s.includes("gilgit")) return "Gilgit-Baltistan";
  if (s.includes("kashmir") || s.includes("ajk")) return "Azad Jammu and Kashmir";
  return "";
}

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
  state?: string;
};

function MoneyBackBadge() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">7-day money-back guarantee</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">
          Shop with confidence — eligible items can be returned within 7 days of delivery per our
          return policy.
        </p>
      </div>
    </div>
  );
}

function defaultFormValues(): Record<string, string> {
  return {
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    shipping_street: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_province: PAKISTAN_PROVINCE_OPTIONS[0]?.value ?? "Punjab",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { ready, resolvedLines, subtotal, clearCart, closeCart, openCart } = useCart();
  const { storeName } = useStoreBrand();
  const skipEmptyCartRedirectOnce = useRef(false);

  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<Record<string, string>>(defaultFormValues);
  const setField = useCallback((id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const [userLoaded, setUserLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [topSummaryOpen, setTopSummaryOpen] = useState(false);
  const [bottomSummaryOpen, setBottomSummaryOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountNotice, setDiscountNotice] = useState<string | null>(null);

  const grandTotal = subtotal + DELIVERY_CHARGE;

  const applyDiscount = useCallback(() => {
    const c = discountCode.trim();
    if (!c) {
      setDiscountNotice("Enter a discount code first.");
      return;
    }
    setDiscountApplied(true);
    setDiscountNotice(
      "If this code is valid, any discount will be confirmed when the order is processed.",
    );
  }, [discountCode]);

  const applyGeocode = useCallback((addr: NominatimAddress) => {
    const parts = [
      addr.house_number,
      addr.road,
      addr.suburb || addr.neighbourhood,
    ].filter(Boolean);
    const street = parts.length ? parts.join(", ") : "";
    const c = addr.city || addr.town || addr.village;
    const mapped = mapStateToProvince(addr.state);
    setFormValues((prev) => ({
      ...prev,
      ...(street ? { shipping_street: street } : {}),
      ...(c ? { shipping_city: c } : {}),
      ...(addr.postcode ? { shipping_postal_code: addr.postcode } : {}),
      ...(mapped ? { shipping_province: mapped } : {}),
    }));
  }, []);

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  useEffect(() => {
    if (!ready) return;
    if (resolvedLines.length === 0) {
      if (skipEmptyCartRedirectOnce.current) {
        skipEmptyCartRedirectOnce.current = false;
        return;
      }
      router.replace("/");
    }
  }, [ready, resolvedLines.length, router]);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session && isCompletingPasswordReset(session)) {
          router.replace("/reset-password");
          setUserLoaded(true);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) {
          setUserLoaded(true);
          return;
        }
        setSignedIn(true);
        const m = readNames((user.user_metadata ?? {}) as Record<string, unknown>);
        const { data: row } = await supabase
          .from("users")
          .select("first_name,last_name,phone")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setFormValues((prev) => ({
          ...prev,
          email: user.email ?? prev.email,
          first_name:
            (row?.first_name ?? "").trim() || m.first || prev.first_name,
          last_name: (row?.last_name ?? "").trim() || m.last || prev.last_name,
          phone: (row?.phone ?? "").trim() || prev.phone,
        }));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setUserLoaded(true);
      }
    }
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function useMyLocation() {
    setLocError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Location is not supported in this browser.");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
          );
          const data = (await res.json()) as { address?: NominatimAddress; error?: string };
          if (!res.ok) {
            setLocError(data.error ?? "Location lookup failed. Try again or enter your address manually.");
            return;
          }
          if (data.address) applyGeocode(data.address);
          else setLocError("Could not read address from your location.");
        } catch {
          setLocError("Could not resolve address. Try again or enter manually.");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setLocLoading(false);
        setLocError("Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValues.phone?.trim()) {
      setFormError("Please enter a valid phone number for delivery.");
      return;
    }
    setFormError(null);
    setSubmitError(null);
    setPlacing(true);
    try {
      const items = resolvedLines.map(({ line }) => ({
        variant_id: line.variantId,
        quantity: line.quantity,
      }));
      const res = await fetch("/api/orders/place", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formValues.email?.trim() ?? "",
          first_name: formValues.first_name?.trim() ?? "",
          last_name: formValues.last_name?.trim() ?? "",
          phone: formValues.phone?.trim() ?? "",
          shipping_street: formValues.shipping_street?.trim() ?? "",
          shipping_city: formValues.shipping_city?.trim() ?? "",
          shipping_postal_code: formValues.shipping_postal_code?.trim() ?? "",
          shipping_province: formValues.shipping_province ?? "",
          shipping_country: SHIPPING_COUNTRY_CODE,
          currency: STORE_CURRENCY_CODE,
          items,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        order_number?: string;
        total_cents?: number;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setSubmitError(data.error ?? "Could not place order. Please try again.");
        return;
      }
      if (!data.order_number || data.total_cents == null) {
        setSubmitError("Unexpected response from server.");
        return;
      }
      skipEmptyCartRedirectOnce.current = true;
      try {
        sessionStorage.setItem(
          CHECKOUT_THANK_YOU_META_KEY,
          JSON.stringify({
            email: formValues.email?.trim(),
            signedIn,
          }),
        );
      } catch {
        /* private mode / quota */
      }
      router.replace(
        `/checkout/thank-you?order=${encodeURIComponent(data.order_number)}&total_cents=${String(data.total_cents)}`,
      );
      clearCart();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  const inputClass = useMemo(
    () =>
      "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15",
    [],
  );

  if (!ready || !userLoaded) {
    return (
      <CheckoutChrome mode="checkout">
        <main
          id="MainContent"
          className="flex min-h-[50vh] flex-col items-center justify-center text-center"
        >
          <p className="text-sm text-neutral-600">Loading checkout…</p>
        </main>
      </CheckoutChrome>
    );
  }

  return (
    <CheckoutChrome mode="checkout">
      <main id="MainContent" className="pb-12 md:pb-0">
        <div className="mx-auto w-full max-w-[1140px] md:grid md:min-h-screen md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-0">
          <div className="w-full bg-white px-4 py-6 sm:px-6 md:min-h-screen md:px-8 md:py-8 lg:px-12">
            <div className="mb-5 border-b border-neutral-200 pb-4 md:mb-6">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex min-w-0 items-center gap-2.5">
                  <Image
                    src="/dummy-logo.svg"
                    alt=""
                    width={40}
                    height={40}
                    priority
                    className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
                  />
                  <span className="truncate text-sm font-semibold capitalize tracking-tight text-neutral-900 sm:text-base">
                    {storeName}
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Back to cart"
                  onClick={() => openCart()}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-800 transition-colors hover:bg-neutral-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H7.2" />
                  </svg>
                </button>
              </div>
            </div>

            <form id="checkout-form" onSubmit={onSubmit} className="mt-6 space-y-5 md:mt-8">
              <div className="md:hidden">
                <CheckoutOrderSummaryAccordion
                  id="co-summary-top"
                  expanded={topSummaryOpen}
                  onToggle={() => setTopSummaryOpen((o) => !o)}
                  lines={resolvedLines}
                  subtotal={subtotal}
                  shipping={DELIVERY_CHARGE}
                  total={grandTotal}
                  discountCode={discountCode}
                  onDiscountCodeChange={(v) => {
                    setDiscountCode(v);
                    setDiscountNotice(null);
                  }}
                  onApplyDiscount={applyDiscount}
                  discountApplied={discountApplied}
                  discountNotice={discountNotice}
                />
              </div>

            <div
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              aria-label="Delivery and contact"
            >
              <CheckoutTemplateFields
                template={CHECKOUT_TEMPLATE}
                values={formValues}
                onChange={(id, value) => {
                  setField(id, value);
                  if (id === "phone") setFormError(null);
                }}
                inputClassName={inputClass}
                rootClassName="mt-0 space-y-8"
                phoneError={formError}
                locError={locError}
                locLoading={locLoading}
                onUseLocation={useMyLocation}
              />
            </div>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <h2 className="text-base font-semibold text-neutral-900">Shipping method</h2>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm">
                <span className="text-sm leading-tight text-neutral-800">
                  Standard delivery (dispatch in 3–5 business days)
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-neutral-900">
                  {formatPkr(DELIVERY_CHARGE)}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-600">
                Estimated delivery: 3–5 business days after confirmation.
              </p>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <h2 className="text-base font-semibold text-neutral-900">Payment</h2>
              <p className="mt-1 text-xs text-neutral-500">
                All transactions are secure and encrypted.
              </p>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-semibold text-neutral-900">Cash on Delivery (COD)</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Pay when your order arrives at your delivery address.
                </p>
              </div>
            </section>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <MoneyBackBadge />
            </div>

              <div className="md:hidden">
                <CheckoutOrderSummaryAccordion
                  id="co-summary-bottom"
                  expanded={bottomSummaryOpen}
                  onToggle={() => setBottomSummaryOpen((o) => !o)}
                  lines={resolvedLines}
                  subtotal={subtotal}
                  shipping={DELIVERY_CHARGE}
                  total={grandTotal}
                  discountCode={discountCode}
                  onDiscountCodeChange={(v) => {
                    setDiscountCode(v);
                    setDiscountNotice(null);
                  }}
                  onApplyDiscount={applyDiscount}
                  discountApplied={discountApplied}
                  discountNotice={discountNotice}
                />
              </div>

              {submitError ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={placing}
                className="w-full rounded-md bg-neutral-950 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placing ? "Placing order…" : "Complete order"}
              </button>

              <CheckoutPolicyFooterLinks />
            </form>
          </div>
          <aside className="hidden border-l border-neutral-200 bg-[#f5f5f5] md:block md:px-8 md:py-0 lg:px-10">
            <div className="md:sticky md:top-0 md:h-screen md:overflow-y-auto md:pt-8 md:pb-8">
              <CheckoutOrderSummaryPanel
                lines={resolvedLines}
                subtotal={subtotal}
                shipping={DELIVERY_CHARGE}
                total={grandTotal}
                discountCode={discountCode}
                onDiscountCodeChange={(v) => {
                  setDiscountCode(v);
                  setDiscountNotice(null);
                }}
                onApplyDiscount={applyDiscount}
                discountApplied={discountApplied}
                discountNotice={discountNotice}
              />
            </div>
          </aside>
        </div>
      </main>
    </CheckoutChrome>
  );
}
