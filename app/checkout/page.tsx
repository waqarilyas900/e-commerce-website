"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CHECKOUT_PENDING_CART_CLEAR_KEY,
  CHECKOUT_PENDING_PURCHASE_EVENT_KEY,
  CHECKOUT_THANK_YOU_META_KEY,
} from "@/app/lib/checkout-thank-you";
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
import { SignInModal } from "@/components/auth/sign-in-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { isCompletingPasswordReset } from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/app/providers/cart-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { SiteLogoMark } from "@/components/site-logo";
import { computeDeliveryPkr, nextFreeDeliveryGapPkr } from "@/app/lib/delivery-pricing";

type SignInModalReason = "save-address" | "voucher" | "general";

const SIGN_IN_MODAL_COPY: Record<SignInModalReason, { title: string; description: string }> = {
  "save-address": {
    title: "Sign in to save this information",
    description:
      "Sign in to save your delivery details for faster checkout next time. You will stay on this page.",
  },
  voucher: {
    title: "Sign in to apply your voucher",
    description: "Sign in to use your discount code on this order. You will stay on this page.",
  },
  general: {
    title: "Sign in",
    description: "Sign in to your account. You will stay on this page.",
  },
};
import { fetchStoreDeliverySettings } from "@/app/lib/fetch-store-delivery-settings";
import { hasCatalogDb } from "@/app/lib/db/env";
import { voucherErrorMessage } from "@/app/lib/voucher-user-messages";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";
import { metaContentsFromCartLines, toPkrValue, trackMetaPixel } from "@/lib/seo/meta-pixel-client";
import type { SavedAddress } from "@/app/lib/saved-addresses";
import { pakistanCheckoutPhoneError } from "@/app/lib/validate-pakistan-phone";

const CHECKOUT_TEMPLATE = PAKISTAN_STANDARD_CHECKOUT;

/** ISO 3166-1 alpha-2 — must match `place_order` (Pakistan-only storefront). */
const SHIPPING_COUNTRY_CODE = "PK";

function readNames(meta: Record<string, unknown>) {
  const first = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  return { first, last };
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

function fingerprintCheckoutAddress(values: Record<string, string>): string {
  return JSON.stringify({
    first_name: normalizeText(values.first_name),
    last_name: normalizeText(values.last_name),
    phone: normalizePhone(values.phone),
    shipping_street: normalizeText(values.shipping_street),
    shipping_city: normalizeText(values.shipping_city),
    shipping_postal_code: normalizeText(values.shipping_postal_code),
    shipping_province: normalizeText(values.shipping_province),
  });
}

function fingerprintSavedAddress(address: SavedAddress): string {
  return JSON.stringify({
    first_name: normalizeText(address.first_name),
    last_name: normalizeText(address.last_name),
    phone: normalizePhone(address.phone),
    shipping_street: normalizeText(address.shipping_street),
    shipping_city: normalizeText(address.shipping_city),
    shipping_postal_code: normalizeText(address.shipping_postal_code),
    shipping_province: normalizeText(address.shipping_province),
  });
}

function CheckoutPageSkeleton() {
  return (
    <CheckoutChrome mode="checkout">
      <main id="MainContent" className="pb-12 md:pb-0" aria-busy="true" aria-live="polite">
        <div className="mx-auto w-full max-w-[1140px] md:grid md:min-h-screen md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="w-full bg-white shell-x py-6 md:min-h-screen md:py-8">
            <div className="mb-5 border-b border-neutral-200 pb-4 md:mb-6">
              <div className="h-6 w-36 animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="space-y-5 md:space-y-7">
              <div className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-56 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-36 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-12 animate-pulse rounded-md bg-neutral-200" />
            </div>
          </div>
          <aside className="hidden border-l border-neutral-200 bg-[#f5f5f5] md:block shell-x md:py-8">
            <div className="space-y-4">
              <div className="h-8 w-36 animate-pulse rounded bg-neutral-200" />
              <div className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-white" />
              <div className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-white" />
              <div className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-white" />
              <div className="h-24 animate-pulse rounded-lg border border-neutral-200 bg-white" />
            </div>
          </aside>
        </div>
      </main>
    </CheckoutChrome>
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
  const {
    ready,
    lines,
    isResolvingCart,
    resolvedLines,
    subtotal,
    closeCart,
    openCart,
  } = useCart();
  const { user, session, authReady, nameProfile } = useAuth();
  const signedIn = Boolean(user);
  const { storeName } = useStoreBrand();
  const skipEmptyCartRedirectOnce = useRef(false);
  const linesLengthRef = useRef(0);
  linesLengthRef.current = lines.length;

  const [placing, setPlacing] = useState(false);
  const [redirectingToConfirmation, setRedirectingToConfirmation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<Record<string, string>>(defaultFormValues);
  const setField = useCallback((id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const [formError, setFormError] = useState<string | null>(null);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [signInModalReason, setSignInModalReason] = useState<SignInModalReason>("general");
  const [savedAddressDeleteId, setSavedAddressDeleteId] = useState<string | null>(null);
  const [saveForNextTime, setSaveForNextTime] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [saveAddressErrors, setSaveAddressErrors] = useState<Partial<Record<string, string>>>({});
  const saveIntentAfterSignInRef = useRef(false);
  const voucherIntentAfterSignInRef = useRef(false);

  const openSignInModal = useCallback((reason: SignInModalReason) => {
    setSignInModalReason(reason);
    setSignInModalOpen(true);
  }, []);

  const dismissSignInModal = useCallback(() => {
    saveIntentAfterSignInRef.current = false;
    voucherIntentAfterSignInRef.current = false;
    setSignInModalOpen(false);
  }, []);
  const sentInitiateCheckoutRef = useRef<Set<string>>(new Set());
  /** Always points at latest validator so `persistCurrentAddress` never hits TDZ if hooks are reordered. */
  const validateSaveAddressFieldsRef = useRef<() => boolean>(() => false);

  const [topSummaryOpen, setTopSummaryOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPreviewCents, setDiscountPreviewCents] = useState<number | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [discountNotice, setDiscountNotice] = useState<string | null>(null);
  const [discountNoticeIsError, setDiscountNoticeIsError] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  const clearDiscountNotice = useCallback(() => {
    setDiscountNotice(null);
    setDiscountNoticeIsError(false);
  }, []);

  const setDiscountIssue = useCallback((message: string) => {
    setDiscountNotice(message);
    setDiscountNoticeIsError(true);
  }, []);

  const [deliverySettings, setDeliverySettings] = useState<{
    standardPaisa: number;
    freeThresholdsPaisa: number[];
  }>({
    standardPaisa: FALLBACK_STANDARD_DELIVERY_PAISA,
    freeThresholdsPaisa: [],
  });

  const cartResolving =
    hasCatalogDb() && lines.length > 0 && resolvedLines.length === 0 && isResolvingCart;

  const cartResolveFailed =
    ready &&
    hasCatalogDb() &&
    lines.length > 0 &&
    resolvedLines.length === 0 &&
    !isResolvingCart;

  /** Subtotal of lines that count toward standard delivery and store free-delivery thresholds. */
  const merchandiseShippingBasisPkr = useMemo(
    () =>
      resolvedLines.reduce(
        (sum, { line, unitPrice, product }) =>
          product.freeDelivery ? sum : sum + unitPrice * line.quantity,
        0,
      ),
    [resolvedLines],
  );

  const deliveryPkr = useMemo(() => {
    if (cartResolving) return 0;
    return computeDeliveryPkr(merchandiseShippingBasisPkr, {
      standard_delivery_paisa: deliverySettings.standardPaisa,
      free_delivery_thresholds_paisa: deliverySettings.freeThresholdsPaisa,
    });
  }, [cartResolving, merchandiseShippingBasisPkr, deliverySettings]);

  const freeDeliveryGapPkr = useMemo(
    () =>
      cartResolving
        ? null
        : nextFreeDeliveryGapPkr(
            merchandiseShippingBasisPkr,
            deliverySettings.freeThresholdsPaisa,
          ),
    [cartResolving, merchandiseShippingBasisPkr, deliverySettings.freeThresholdsPaisa],
  );

  const shippingWaiverCutoffPkr = useMemo(() => {
    if (cartResolving) return null;
    const subPaisa = Math.round(merchandiseShippingBasisPkr * 100);
    const qualified = deliverySettings.freeThresholdsPaisa
      .filter((t) => Number.isFinite(t) && t > 0 && subPaisa >= t)
      .sort((a, b) => b - a);
    return qualified[0] != null ? qualified[0] / 100 : null;
  }, [cartResolving, merchandiseShippingBasisPkr, deliverySettings.freeThresholdsPaisa]);

  const discountPkr =
    discountApplied && discountPreviewCents != null && discountPreviewCents > 0
      ? discountPreviewCents / 100
      : 0;

  const grandTotal = Math.max(0, subtotal + deliveryPkr - discountPkr);

  const freeShippingThresholdPkr = useMemo(() => {
    const tiers = deliverySettings.freeThresholdsPaisa.filter((t) => t > 0);
    if (tiers.length === 0) return null;
    return Math.min(...tiers) / 100;
  }, [deliverySettings.freeThresholdsPaisa]);

  const standardDeliveryPkr = deliverySettings.standardPaisa / 100;

  const cartFingerprint = useMemo(
    () => resolvedLines.map(({ line }) => `${line.variantId}:${line.quantity}`).join("|"),
    [resolvedLines],
  );

  useEffect(() => {
    if (!ready || cartResolving || resolvedLines.length === 0) return;
    const dedupeKey = `${cartFingerprint}|${Math.round(grandTotal * 100)}`;
    if (sentInitiateCheckoutRef.current.has(dedupeKey)) return;
    sentInitiateCheckoutRef.current.add(dedupeKey);
    trackMetaPixel("InitiateCheckout", {
      content_ids: resolvedLines.map(({ line }) => line.variantId),
      contents: metaContentsFromCartLines(resolvedLines),
      content_type: "product",
      num_items: resolvedLines.reduce((sum, { line }) => sum + line.quantity, 0),
      currency: STORE_CURRENCY_CODE,
      value: toPkrValue(grandTotal),
    });
  }, [ready, cartResolving, resolvedLines, cartFingerprint, grandTotal]);

  useEffect(() => {
    setDiscountPreviewCents(null);
    setDiscountApplied(false);
    setDiscountNotice(null);
    setDiscountNoticeIsError(false);
  }, [cartFingerprint]);

  const applyDiscount = useCallback(async () => {
    const c = discountCode.trim();
    if (!c) {
      setDiscountIssue("Enter a discount code first.");
      return;
    }
    if (!signedIn) {
      clearDiscountNotice();
      voucherIntentAfterSignInRef.current = true;
      openSignInModal("voucher");
      return;
    }
    if (
      hasCatalogDb() &&
      lines.length > 0 &&
      resolvedLines.length === 0 &&
      isResolvingCart
    ) {
      setDiscountIssue("Your cart is still loading. Try again in a moment.");
      return;
    }
    if (resolvedLines.length === 0) {
      setDiscountIssue("Your cart is empty.");
      return;
    }
    setApplyingVoucher(true);
    clearDiscountNotice();
    try {
      const productIds = [...new Set(resolvedLines.map((r) => r.line.productId))];
      const res = await fetch("/api/vouchers/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: c,
          cart_subtotal: subtotal,
          product_ids: productIds,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        discount_cents?: number;
        error?: string;
        error_code?: string;
      };
      if (!res.ok || data.ok === false) {
        setDiscountApplied(false);
        setDiscountPreviewCents(null);
        setDiscountIssue(
          voucherErrorMessage(data.error_code, data.error ?? "That code could not be applied."),
        );
        return;
      }
      const cents = data.discount_cents;
      if (cents == null || !Number.isFinite(cents) || cents <= 0) {
        setDiscountApplied(false);
        setDiscountPreviewCents(null);
        setDiscountIssue("No discount applies to this order.");
        return;
      }
      setDiscountPreviewCents(Math.round(cents));
      setDiscountApplied(true);
    } catch {
      setDiscountApplied(false);
      setDiscountPreviewCents(null);
      setDiscountIssue("Could not verify the code. Try again.");
    } finally {
      setApplyingVoucher(false);
    }
  }, [
    clearDiscountNotice,
    discountCode,
    isResolvingCart,
    lines.length,
    openSignInModal,
    resolvedLines,
    setDiscountIssue,
    signedIn,
    subtotal,
  ]);

  const fetchSavedAddresses = useCallback(async () => {
    if (!signedIn) {
      setSavedAddresses([]);
      setSelectedSavedAddressId(null);
      return;
    }
    setSavedAddressesLoading(true);
    try {
      const res = await fetch("/api/checkout/saved-addresses", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; addresses?: SavedAddress[] };
      const list = Array.isArray(data.addresses) ? data.addresses : [];
      setSavedAddresses(list);
      setSelectedSavedAddressId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return null;
      });
    } catch {
      /* ignore */
    } finally {
      setSavedAddressesLoading(false);
    }
  }, [signedIn]);

  const applySavedAddress = useCallback((addressId: string) => {
    const selected = savedAddresses.find((a) => a.id === addressId);
    if (!selected) return;
    setSelectedSavedAddressId(addressId);
    setFormValues((prev) => ({
      ...prev,
      first_name: selected.first_name.trim() || prev.first_name,
      last_name: selected.last_name.trim() || prev.last_name,
      phone: selected.phone.trim() || prev.phone,
      shipping_street: selected.shipping_street,
      shipping_city: selected.shipping_city,
      shipping_postal_code: selected.shipping_postal_code,
      shipping_province: selected.shipping_province || prev.shipping_province,
    }));
    setSaveAddressErrors({});
  }, [savedAddresses]);

  const validateSaveAddressFields = useCallback(() => {
    const required: Array<{ id: string; label: string; value: string }> = [
      { id: "first_name", label: "First name", value: formValues.first_name ?? "" },
      { id: "last_name", label: "Last name", value: formValues.last_name ?? "" },
      { id: "phone", label: "Phone number", value: formValues.phone ?? "" },
      { id: "shipping_street", label: "Street address", value: formValues.shipping_street ?? "" },
      { id: "shipping_city", label: "City", value: formValues.shipping_city ?? "" },
    ];
    const nextErrors: Partial<Record<string, string>> = {};
    for (const field of required) {
      if (!field.value.trim()) {
        nextErrors[field.id] = `${field.label} is required.`;
      }
    }
    setSaveAddressErrors(nextErrors);
    const firstInvalid = required.find((field) => nextErrors[field.id]);
    if (firstInvalid && typeof document !== "undefined") {
      const el = document.getElementById(`co-${firstInvalid.id}`) as HTMLElement | null;
      el?.focus();
    }
    return Object.keys(nextErrors).length === 0;
  }, [
    formValues.first_name,
    formValues.last_name,
    formValues.phone,
    formValues.shipping_city,
    formValues.shipping_street,
  ]);

  validateSaveAddressFieldsRef.current = validateSaveAddressFields;

  const persistCurrentAddress = useCallback(async () => {
    if (!signedIn) return false;
    if (!validateSaveAddressFieldsRef.current()) return false;
    setSavingAddress(true);
    try {
      const res = await fetch("/api/checkout/saved-addresses", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_id: selectedSavedAddressId ?? undefined,
          label: "",
          first_name: formValues.first_name?.trim() ?? "",
          last_name: formValues.last_name?.trim() ?? "",
          phone: formValues.phone?.trim() ?? "",
          shipping_street: formValues.shipping_street?.trim() ?? "",
          shipping_city: formValues.shipping_city?.trim() ?? "",
          shipping_postal_code: formValues.shipping_postal_code?.trim() ?? "",
          shipping_province: formValues.shipping_province ?? "",
          shipping_country: SHIPPING_COUNTRY_CODE,
          set_default: false,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save address. Please try again.");
        return false;
      }
      const data = (await res.json()) as { ok?: boolean; address?: SavedAddress };
      if (!data.ok || !data.address) {
        toast.error("Could not save address. Please try again.");
        return false;
      }
      await fetchSavedAddresses();
      toast.success("Address saved.");
      return true;
    } catch {
      toast.error("Could not save address. Please try again.");
      return false;
    } finally {
      setSavingAddress(false);
    }
  }, [
    fetchSavedAddresses,
    formValues.first_name,
    formValues.last_name,
    formValues.phone,
    formValues.shipping_city,
    formValues.shipping_postal_code,
    formValues.shipping_province,
    formValues.shipping_street,
    selectedSavedAddressId,
    signedIn,
  ]);

  const openDeleteSavedAddressConfirm = useCallback((id: string) => {
    setSavedAddressDeleteId(id);
  }, []);

  const confirmDeleteSavedAddress = useCallback(async () => {
    const id = savedAddressDeleteId;
    if (!id) return false;
    setSavingAddress(true);
    try {
      const res = await fetch("/api/checkout/saved-addresses", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address_id: id }),
      });
      if (!res.ok) {
        toast.error("Could not delete address.");
        return false;
      }
      if (selectedSavedAddressId === id) {
        setSelectedSavedAddressId(null);
      }
      await fetchSavedAddresses();
      toast.success("Address deleted.");
    } catch {
      toast.error("Could not delete address.");
      return false;
    } finally {
      setSavingAddress(false);
    }
  }, [fetchSavedAddresses, savedAddressDeleteId, selectedSavedAddressId]);

  const savedAddressDeletePreview = useMemo(() => {
    const a = savedAddresses.find((x) => x.id === savedAddressDeleteId);
    if (!a) return null;
    const line = [a.shipping_street, a.shipping_city, a.shipping_province]
      .map((v) => v.trim())
      .filter(Boolean)
      .join(", ");
    const title = a.label.trim() || "Saved address";
    return { title, line };
  }, [savedAddresses, savedAddressDeleteId]);

  const handleEditSavedAddress = useCallback((id: string) => {
    applySavedAddress(id);
    setSaveForNextTime(true);
  }, [applySavedAddress]);

  const handleToggleSaveForNextTime = useCallback((checked: boolean) => {
    if (checked && !signedIn) {
      saveIntentAfterSignInRef.current = true;
      openSignInModal("save-address");
      return;
    }
    setSaveForNextTime(checked);
  }, [openSignInModal, signedIn]);

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  useEffect(() => {
    if (!signedIn) {
      setSavedAddresses([]);
      setSelectedSavedAddressId(null);
      setSaveForNextTime(false);
      setSaveAddressErrors({});
      return;
    }
    void fetchSavedAddresses();
  }, [fetchSavedAddresses, signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    if (saveIntentAfterSignInRef.current) {
      saveIntentAfterSignInRef.current = false;
      setSignInModalOpen(false);
      setSaveForNextTime(true);
      return;
    }
    if (voucherIntentAfterSignInRef.current) {
      voucherIntentAfterSignInRef.current = false;
      setSignInModalOpen(false);
      void applyDiscount();
    }
  }, [applyDiscount, signedIn]);

  useEffect(() => {
    if (!hasCatalogDb()) return;
    let cancelled = false;
    void (async () => {
      const loaded = await fetchStoreDeliverySettings();
      if (cancelled || !loaded) return;
      setDeliverySettings({
        standardPaisa: loaded.standardPaisa,
        freeThresholdsPaisa: loaded.freeThresholdsPaisa,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    /** Only bounce home when there are no raw cart lines — not while lines exist but still resolving. */
    if (lines.length > 0) return;
    if (skipEmptyCartRedirectOnce.current) {
      skipEmptyCartRedirectOnce.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (linesLengthRef.current > 0) return;
      router.replace("/");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [ready, lines.length, router]);

  useEffect(() => {
    if (!authReady) return;
    if (session && isCompletingPasswordReset(session)) {
      router.replace("/reset-password");
      return;
    }
    if (!user) return;
    const activeUser = user;

    let cancelled = false;
    async function fillCheckoutIdentity() {
      try {
        const m = readNames((activeUser.user_metadata ?? {}) as Record<string, unknown>);
        const supabase = createClient();
        const { data: row } = await supabase
          .from("users")
          .select("first_name,last_name,phone")
          .eq("auth_id", activeUser.id)
          .maybeSingle();
        if (cancelled) return;
        const profileFirst = (nameProfile?.first_name ?? "").trim();
        const profileLast = (nameProfile?.last_name ?? "").trim();
        setFormValues((prev) => ({
          ...prev,
          email: activeUser.email ?? prev.email,
          first_name:
            (row?.first_name ?? "").trim() ||
            profileFirst ||
            m.first ||
            prev.first_name,
          last_name:
            (row?.last_name ?? "").trim() ||
            profileLast ||
            m.last ||
            prev.last_name,
          phone: (row?.phone ?? "").trim() || prev.phone,
        }));
      } catch {
        /* ignore */
      }
    }
    void fillCheckoutIdentity();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, user, nameProfile, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const phoneError = pakistanCheckoutPhoneError(formValues.phone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }
    setFormError(null);
    setSubmitError(null);
    setPlacing(true);
    let successNavigation = false;
    try {
      const items = resolvedLines.map(({ line }) => ({
        variant_id: line.variantId,
        quantity: line.quantity,
      }));
      const selectedAddress = selectedSavedAddressId
        ? savedAddresses.find((a) => a.id === selectedSavedAddressId) ?? null
        : null;
      const selectedAddressUnchanged = selectedAddress
        ? fingerprintCheckoutAddress(formValues) === fingerprintSavedAddress(selectedAddress)
        : false;
      const savedAddressIdForOrder = selectedAddressUnchanged ? selectedSavedAddressId : null;
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
          ...(savedAddressIdForOrder ? { saved_address_id: savedAddressIdForOrder } : {}),
          ...(discountApplied && discountCode.trim() !== ""
            ? { voucher_code: discountCode.trim() }
            : {}),
          ...(newsletterOptIn ? { newsletter_opt_in: true } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        order_number?: string;
        total_cents?: number;
        error?: string;
        error_code?: string;
      };
      if (!res.ok || data.ok === false) {
        setSubmitError(
          voucherErrorMessage(data.error_code, data.error ?? "Could not place order. Please try again."),
        );
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
            phone: formValues.phone?.trim(),
            firstName: formValues.first_name?.trim(),
            lastName: formValues.last_name?.trim(),
            city: formValues.shipping_city?.trim(),
            state: formValues.shipping_province?.trim(),
            zip: formValues.shipping_postal_code?.trim(),
            country: SHIPPING_COUNTRY_CODE,
            signedIn,
          }),
        );
      } catch {
        /* private mode / quota */
      }
      try {
        sessionStorage.setItem(CHECKOUT_PENDING_CART_CLEAR_KEY, "1");
      } catch {
        /* private mode / quota */
      }
      try {
        sessionStorage.setItem(
          CHECKOUT_PENDING_PURCHASE_EVENT_KEY,
          JSON.stringify({
            orderNumber: data.order_number,
            totalCents: data.total_cents,
            currency: STORE_CURRENCY_CODE,
            contentIds: resolvedLines.map(({ line }) => line.variantId),
            contents: metaContentsFromCartLines(resolvedLines),
            numItems: resolvedLines.reduce((sum, { line }) => sum + line.quantity, 0),
          }),
        );
      } catch {
        /* private mode / quota */
      }
      if (signedIn && saveForNextTime && !savedAddressIdForOrder) {
        await persistCurrentAddress();
      }
      setRedirectingToConfirmation(true);
      successNavigation = true;
      router.replace(
        `/checkout/thank-you?order=${encodeURIComponent(data.order_number)}&total_cents=${String(data.total_cents)}`,
      );
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      if (!successNavigation) setPlacing(false);
    }
  }

  const inputClass = useMemo(
    () =>
      "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15",
    [],
  );

  const pendingCartCatalog =
    hasCatalogDb() && lines.length > 0 && resolvedLines.length === 0 && isResolvingCart;

  const preventCheckoutEnterSubmit = useCallback((e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-voucher-field]")) return;
    if (target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement && target.type === "submit") return;
    if (target instanceof HTMLInputElement && target.type === "submit") return;
    e.preventDefault();
  }, []);

  if (!ready) {
    return <CheckoutPageSkeleton />;
  }

  if (redirectingToConfirmation) {
    return (
      <CheckoutChrome mode="checkout">
        <main
          id="MainContent"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-4 shell-x text-center"
          aria-busy="true"
          aria-live="polite"
        >
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"
            aria-hidden
          />
          <div>
            <p className="text-base font-semibold text-neutral-900">Order placed</p>
            <p className="mt-1.5 text-sm text-neutral-600">
              Taking you to your confirmation…
            </p>
          </div>
        </main>
      </CheckoutChrome>
    );
  }

  return (
    <CheckoutChrome mode="checkout">
      <main id="MainContent" className="pb-12 md:pb-0">
        <div className="mx-auto w-full max-w-[1140px] md:grid md:min-h-screen md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="w-full bg-white shell-x py-6 md:min-h-screen md:py-8">
            <div className="mb-5 border-b border-neutral-200 pb-4 md:mb-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex min-w-0 items-center"
                  aria-label={`${storeName} home`}
                >
                  <SiteLogoMark size="large" />
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

            <div className="mt-6 space-y-5 md:mt-8">
              <div className="md:hidden">
                <CheckoutOrderSummaryAccordion
                  id="co-summary-top"
                  expanded={topSummaryOpen}
                  onToggle={() => setTopSummaryOpen((o) => !o)}
                  lines={resolvedLines}
                  subtotal={subtotal}
                  shipping={deliveryPkr}
                  total={grandTotal}
                  shippingWaiverCutoffPkr={shippingWaiverCutoffPkr}
                  standardDeliveryPkr={standardDeliveryPkr}
                  freeShippingThresholdPkr={freeShippingThresholdPkr}
                  discountCode={discountCode}
                  onDiscountCodeChange={(v) => {
                    setDiscountCode(v);
                    clearDiscountNotice();
                    setDiscountApplied(false);
                    setDiscountPreviewCents(null);
                  }}
                  onApplyDiscount={() => void applyDiscount()}
                  discountApplied={discountApplied}
                  discountPkr={discountPkr}
                  discountNotice={discountNotice}
                  discountNoticeIsError={discountNoticeIsError}
                  applyingVoucher={applyingVoucher}
                  cartLoading={pendingCartCatalog}
                />
              </div>

            <form
              id="checkout-form"
              onSubmit={onSubmit}
              onKeyDown={preventCheckoutEnterSubmit}
              className="space-y-5"
            >
            <div
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              aria-label="Delivery and contact"
            >
              <CheckoutTemplateFields
                template={CHECKOUT_TEMPLATE}
                values={formValues}
                onChange={(id, value) => {
                  const nextValues = { ...formValues, [id]: value };
                  setField(id, value);
                  if (selectedSavedAddressId) {
                    const selected = savedAddresses.find((a) => a.id === selectedSavedAddressId);
                    if (selected) {
                      const unchanged =
                        fingerprintCheckoutAddress(nextValues) === fingerprintSavedAddress(selected);
                      if (!unchanged) {
                        setSelectedSavedAddressId(null);
                      }
                    }
                  }
                  if (id === "phone") setFormError(null);
                  setSaveAddressErrors((prev) => {
                    if (!prev[id]) return prev;
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                }}
                inputClassName={inputClass}
                rootClassName="mt-0 space-y-4"
                phoneError={formError}
                signedIn={signedIn}
                onRequestSignIn={() => openSignInModal("general")}
                saveForNextTime={saveForNextTime}
                onToggleSaveForNextTime={handleToggleSaveForNextTime}
                savedAddresses={savedAddresses}
                selectedSavedAddressId={selectedSavedAddressId}
                onSelectSavedAddress={applySavedAddress}
                loadingSavedAddresses={savedAddressesLoading}
                onEditSavedAddress={handleEditSavedAddress}
                onDeleteSavedAddress={openDeleteSavedAddressConfirm}
                savingAddress={savingAddress}
                saveAddressErrors={saveAddressErrors}
              />
            </div>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <h2 className="text-base font-semibold text-neutral-900">Shipping method</h2>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm">
                <span className="text-sm leading-tight text-neutral-800">
                  Standard delivery — ships in 3–5 business days
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-neutral-900">
                  {deliveryPkr <= 0 ? "Free" : formatPkr(deliveryPkr)}
                </span>
              </div>
              {freeDeliveryGapPkr != null && freeDeliveryGapPkr > 0 ? (
                <p className="mt-2 text-xs text-emerald-800">
                  Add {formatPkr(freeDeliveryGapPkr)} more from items that pay standard delivery to
                  unlock free standard delivery on this order (free-delivery products don&apos;t
                  count toward this total).
                </p>
              ) : null}
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

              {signedIn ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm text-neutral-800">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  checked={newsletterOptIn}
                  onChange={(e) => setNewsletterOptIn(e.target.checked)}
                />
                <span>Email me with news and offers</span>
              </label>
              ) : null}

              {submitError ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}

              {cartResolveFailed ? (
                <p
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                  role="status"
                >
                  We couldn&apos;t load one or more items in your cart from the catalog. Open your
                  cart and try again, or continue shopping.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={placing || resolvedLines.length === 0 || cartResolveFailed || pendingCartCatalog}
                className="w-full rounded-md bg-neutral-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placing ? "Placing order…" : "Complete order"}
              </button>

              <CheckoutPolicyFooterLinks />
            </form>
            </div>
          </div>
          <aside className="hidden border-l border-neutral-200 bg-[#f5f5f5] md:block shell-x md:py-0">
            <div className="md:sticky md:top-0 md:h-screen md:overflow-y-auto md:pt-8 md:pb-8">
              <CheckoutOrderSummaryPanel
                lines={resolvedLines}
                subtotal={subtotal}
                shipping={deliveryPkr}
                total={grandTotal}
                shippingWaiverCutoffPkr={shippingWaiverCutoffPkr}
                standardDeliveryPkr={standardDeliveryPkr}
                freeShippingThresholdPkr={freeShippingThresholdPkr}
                discountCode={discountCode}
                onDiscountCodeChange={(v) => {
                  setDiscountCode(v);
                  clearDiscountNotice();
                  setDiscountApplied(false);
                  setDiscountPreviewCents(null);
                }}
                onApplyDiscount={() => void applyDiscount()}
                discountApplied={discountApplied}
                discountPkr={discountPkr}
                discountNotice={discountNotice}
                discountNoticeIsError={discountNoticeIsError}
                applyingVoucher={applyingVoucher}
                cartLoading={pendingCartCatalog}
              />
            </div>
          </aside>
        </div>
      </main>
      <ConfirmationModal
        open={savedAddressDeleteId != null}
        onClose={() => setSavedAddressDeleteId(null)}
        title="Delete this saved address?"
        description="It will be removed from your account and won't appear in this list anymore."
        tone="danger"
        confirmLabel="Delete address"
        cancelLabel="Keep address"
        onConfirm={confirmDeleteSavedAddress}
        confirmDisabled={savingAddress}
      >
        {savedAddressDeletePreview ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-900">{savedAddressDeletePreview.title}</p>
            {savedAddressDeletePreview.line ? (
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">{savedAddressDeletePreview.line}</p>
            ) : null}
          </div>
        ) : null}
      </ConfirmationModal>
      <SignInModal
        open={signInModalOpen}
        onClose={dismissSignInModal}
        nextPath="/checkout"
        closeModalOnPasswordSuccess={false}
        refreshAfterSignIn={false}
        title={SIGN_IN_MODAL_COPY[signInModalReason].title}
        description={SIGN_IN_MODAL_COPY[signInModalReason].description}
      />
    </CheckoutChrome>
  );
}
