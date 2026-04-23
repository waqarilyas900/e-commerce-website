"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { GroupBase, StylesConfig } from "react-select";
import { toast } from "sonner";
import {
  USER_GENDER,
  USER_GENDER_PROFILE_OPTIONS,
  parseUserGender,
  type UserGender,
} from "@/lib/enums/user-gender";
import { ProfilePhoneField } from "@/components/account/profile-phone-field";
import type { AppSelectOption } from "@/components/ui/app-select";
import { AppSelect } from "@/components/ui/app-select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { createClient } from "@/lib/supabase/client";
import type { SavedAddress } from "@/app/lib/saved-addresses";
import {
  nominatimToSavedAddressPatch,
  type NominatimAddress,
} from "@/app/lib/nominatim-address";

function readNames(meta: Record<string, unknown>) {
  const first =
    typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  return { first, last };
}

const inputClass =
  "h-[42px] w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 disabled:opacity-60";

const inputReadonlyClass =
  "h-[42px] w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600";

/** Profile gender field: only Male / Female / Prefer not to say (matches DB subset). */
const PROFILE_GENDER_VALUES = new Set<UserGender>([
  USER_GENDER.Male,
  USER_GENDER.Female,
  USER_GENDER.PreferNotToSay,
]);

const GENDER_SELECT_OPTIONS: AppSelectOption[] =
  USER_GENDER_PROFILE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

const profileGenderSelectStyles: StylesConfig<
  AppSelectOption,
  false,
  GroupBase<AppSelectOption>
> = {
  menuPortal: (base) => ({ ...base, zIndex: 100_000 }),
};

/** Matches `AppSelect` control: minHeight 42, rounded-lg — same pulse treatment as collection listing toolbars. */
const selectControlSkeletonClass =
  "h-[42px] w-full animate-pulse rounded-lg bg-neutral-100";

const inputFieldSkeletonClass =
  "h-[42px] w-full animate-pulse rounded-lg bg-neutral-100";

function LabelSkeleton() {
  return (
    <div className="mb-1.5 h-4 w-24 max-w-[40%] animate-pulse rounded bg-neutral-100" />
  );
}

function AddressLabelIcon({
  variant,
}: {
  variant: "home" | "office" | "custom";
}) {
  const cls = "h-5 w-5 shrink-0";
  if (variant === "home") {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5Z"
        />
        <path strokeWidth="1.75" strokeLinecap="round" d="M9 21.5V12h6v9.5" />
      </svg>
    );
  }
  if (variant === "office") {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 22V9.5L12 5l8 4.5V22"
        />
        <path
          strokeWidth="1.75"
          strokeLinecap="round"
          d="M9 22v-8h6v8M9 14h6"
        />
      </svg>
    );
  }
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 5.5h6l9 9-6 6-9-9v-6Z"
      />
      <path strokeWidth="1.75" strokeLinecap="round" d="M8 10h.01" />
    </svg>
  );
}

const ADDRESS_LABEL_OPTIONS: {
  id: "home" | "office" | "custom";
  label: string;
  hint: string;
}[] = [
  { id: "home", label: "Home", hint: "Residential delivery" },
  { id: "office", label: "Office", hint: "Work or business" },
  { id: "custom", label: "Custom", hint: "Name this address" },
];

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <LabelSkeleton />
            <div className={inputFieldSkeletonClass} />
          </div>
          <div>
            <LabelSkeleton />
            <div className={inputFieldSkeletonClass} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <LabelSkeleton />
          <div className={selectControlSkeletonClass} />
        </div>
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
      </div>

      <div className="mt-2 h-10 w-28 animate-pulse rounded-full bg-neutral-100" />
    </div>
  );
}

function formatSignupProvider(provider: string) {
  const labels: Record<string, string> = {
    email: "Email & password",
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    unknown: "—",
  };
  return labels[provider] ?? provider;
}

export function ProfileForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<UserGender>(USER_GENDER.Unspecified);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [signupProvider, setSignupProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressLocLoading, setAddressLocLoading] = useState(false);
  const [addressLocError, setAddressLocError] = useState<string | null>(null);
  const [addressDeleteConfirmId, setAddressDeleteConfirmId] = useState<
    string | null
  >(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabelPreset, setAddressLabelPreset] = useState<
    "home" | "office" | "custom"
  >("home");
  const [addressLabelCustom, setAddressLabelCustom] = useState("");
  const [addressForm, setAddressForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    shipping_street: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_province: "Punjab",
  });

  const genderValue = useMemo(() => {
    if (!PROFILE_GENDER_VALUES.has(gender)) return null;
    return GENDER_SELECT_OPTIONS.find((o) => o.value === gender) ?? null;
  }, [gender]);

  const effectiveAddressLabel = useMemo(() => {
    if (addressLabelPreset === "custom") return addressLabelCustom.trim();
    return addressLabelPreset === "office" ? "Office" : "Home";
  }, [addressLabelCustom, addressLabelPreset]);

  function applyLabelToEditor(label: string) {
    const l = label.trim().toLowerCase();
    if (l === "home") {
      setAddressLabelPreset("home");
      setAddressLabelCustom("");
      return;
    }
    if (l === "office") {
      setAddressLabelPreset("office");
      setAddressLabelCustom("");
      return;
    }
    if (label.trim()) {
      setAddressLabelPreset("custom");
      setAddressLabelCustom(label.trim());
      return;
    }
    setAddressLabelPreset("home");
    setAddressLabelCustom("");
  }

  const resetAddressEditor = useCallback(() => {
    setEditingAddressId(null);
    setAddressLabelPreset("home");
    setAddressLabelCustom("");
    setAddressLocError(null);
    setAddressForm({
      first_name: first.trim(),
      last_name: last.trim(),
      phone: phone.trim(),
      shipping_street: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_province: "Punjab",
    });
  }, [first, last, phone]);

  function requestProfileAddressLocation() {
    setAddressLocError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAddressLocError("Location is not supported in this browser.");
      return;
    }
    setAddressLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
          );
          const data = (await res.json()) as {
            address?: NominatimAddress;
            error?: string;
          };
          if (!res.ok) {
            setAddressLocError(
              data.error ??
                "Location lookup failed. Try again or enter your address manually.",
            );
            return;
          }
          if (data.address) {
            const patch = nominatimToSavedAddressPatch(data.address);
            setAddressForm((prev) => ({ ...prev, ...patch }));
            if (Object.keys(patch).length === 0) {
              setAddressLocError("Could not read address from your location.");
            }
          } else {
            setAddressLocError("Could not read address from your location.");
          }
        } catch {
          setAddressLocError(
            "Could not resolve address. Try again or enter manually.",
          );
        } finally {
          setAddressLocLoading(false);
        }
      },
      () => {
        setAddressLocLoading(false);
        setAddressLocError("Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const loadSavedAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/checkout/saved-addresses", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        toast.error("Could not load saved addresses.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        addresses?: SavedAddress[];
      };
      const list = Array.isArray(data.addresses) ? data.addresses : [];
      setSavedAddresses(list);
    } catch {
      toast.error("Could not load saved addresses.");
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  const confirmDeleteProfileAddress = useCallback(async () => {
    const id = addressDeleteConfirmId;
    if (!id) return false;
    setAddressSaving(true);
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
      if (editingAddressId === id) {
        resetAddressEditor();
      }
      toast.success("Address deleted.");
      await loadSavedAddresses();
    } catch {
      toast.error("Could not delete address.");
      return false;
    } finally {
      setAddressSaving(false);
    }
  }, [
    addressDeleteConfirmId,
    editingAddressId,
    loadSavedAddresses,
    resetAddressEditor,
  ]);

  const pendingDeleteAddressSummary = useMemo(() => {
    const a = savedAddresses.find((x) => x.id === addressDeleteConfirmId);
    if (!a) return null;
    const line = [a.shipping_street, a.shipping_city, a.shipping_province]
      .map((v) => v.trim())
      .filter(Boolean)
      .join(", ");
    const title = a.label.trim() || "Saved address";
    return { title, line };
  }, [savedAddresses, addressDeleteConfirmId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        setEmail(user.email ?? "");
        const m = readNames(
          (user.user_metadata ?? {}) as Record<string, unknown>,
        );

        const { data: row, error: rowErr } = await supabase
          .from("users")
          .select(
            "first_name,last_name,phone,gender,date_of_birth,signup_provider",
          )
          .eq("auth_id", user.id)
          .maybeSingle();

        if (!cancelled && !rowErr && row) {
          setFirst((row.first_name ?? "").trim() || m.first);
          setLast((row.last_name ?? "").trim() || m.last);
          setPhone((row.phone ?? "").trim());
          setGender(parseUserGender(row.gender));
          setDateOfBirth(
            row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : "",
          );
          if (row.signup_provider) {
            setSignupProvider(row.signup_provider);
          }
        } else {
          setFirst(m.first);
          setLast(m.last);
        }
      } catch {
        if (!cancelled) toast.error("Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadSavedAddresses();
  }, [loadSavedAddresses]);

  /** Fill address name/phone from profile when idle — skip while editing a saved row so saves aren't wiped. */
  useEffect(() => {
    if (editingAddressId != null) return;
    setAddressForm((prev) => ({
      ...prev,
      first_name: prev.first_name || first.trim(),
      last_name: prev.last_name || last.trim(),
      phone: prev.phone || phone.trim(),
    }));
  }, [editingAddressId, first, last, phone]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You are not signed in.");
        return;
      }

      const fn = first.trim();
      const ln = last.trim();
      const ph = phone.trim();
      const dob = dateOfBirth.trim() || null;

      const { error: upErr } = await supabase.auth.updateUser({
        data: {
          first_name: fn,
          last_name: ln,
        },
      });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const { error: dbErr } = await supabase.from("users").upsert(
        {
          auth_id: user.id,
          first_name: fn,
          last_name: ln,
          phone: ph,
          gender,
          date_of_birth: dob,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_id" },
      );

      if (dbErr) {
        toast.error(dbErr.message);
        return;
      }

      toast.success("Profile saved successfully.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProfileFormSkeleton />;
  }

  return (
    <>
      <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Profile details
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Name, contact, and preferences used across your account.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-5">
          {signupProvider && signupProvider !== "unknown" ? (
            <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              <span className="font-medium text-neutral-900">
                How you signed up
              </span>
              {": "}
              {formatSignupProvider(signupProvider)}
              <span className="mt-1.5 block text-xs leading-relaxed text-neutral-500">
                We save this with your profile so our team can verify your
                account when you contact support. If you use Google or another
                provider, that sign-in is managed in your account security
                settings.
              </span>
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-first"
                className="mb-1.5 block text-sm font-medium text-neutral-800"
              >
                First name
              </label>
              <input
                id="profile-first"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                autoComplete="given-name"
                disabled={saving}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="profile-last"
                className="mb-1.5 block text-sm font-medium text-neutral-800"
              >
                Last name
              </label>
              <input
                id="profile-last"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                autoComplete="family-name"
                disabled={saving}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-1.5 block text-sm font-medium text-neutral-800"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  aria-readonly="true"
                  className={inputReadonlyClass}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-phone"
                  className="mb-1.5 block text-sm font-medium text-neutral-800"
                >
                  Phone number
                </label>
                <ProfilePhoneField
                  id="profile-phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={saving}
                  lockCountry
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-gender"
                className="mb-1.5 block text-sm font-medium text-neutral-800"
              >
                Gender
              </label>
              <AppSelect
                inputId="profile-gender"
                options={GENDER_SELECT_OPTIONS}
                value={genderValue}
                onChange={(opt) => {
                  if (opt) setGender(parseUserGender(opt.value));
                }}
                placeholder="Select gender"
                isDisabled={saving}
                isSearchable={false}
                isClearable={false}
                menuPlacement="auto"
                menuShouldScrollIntoView={false}
                styles={profileGenderSelectStyles}
              />
            </div>
            <div>
              <label
                htmlFor="profile-dob"
                className="mb-1.5 block text-sm font-medium text-neutral-800"
              >
                Date of birth
              </label>
              <input
                id="profile-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={saving}
                className={`${inputClass} min-h-[42px] py-0 leading-normal`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Saved addresses
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Manage addresses for faster checkout. Changes here sync with
              checkout when you&apos;re signed in.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAddressEditor}
            className="shrink-0 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
          >
            New address
          </button>
        </div>

        {addressesLoading ? (
          <p className="mt-6 text-xs text-neutral-500">
            Loading saved addresses…
          </p>
        ) : savedAddresses.length === 0 ? (
          <p className="mt-6 text-xs text-neutral-500">
            No saved addresses yet.
          </p>
        ) : (
          <ul className="mt-6 list-none space-y-3 p-0" role="list">
            {savedAddresses.map((addr, idx) => {
              const summary = [
                addr.shipping_street,
                addr.shipping_city,
                addr.shipping_province,
                addr.shipping_postal_code,
              ]
                .map((v) => v.trim())
                .filter(Boolean)
                .join(", ");
              const title = addr.label.trim() || `Address ${idx + 1}`;
              const isActiveEdit = editingAddressId === addr.id;
              return (
                <li key={addr.id}>
                  <div
                    className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors sm:items-start ${
                      isActiveEdit
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-tight text-neutral-900">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{summary}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 self-start sm:self-center">
                      <button
                        type="button"
                        disabled={addressSaving}
                        aria-label={`Edit address: ${title}`}
                        title="Edit address"
                        onClick={() => {
                          setEditingAddressId(addr.id);
                          applyLabelToEditor(addr.label);
                          setAddressForm({
                            first_name: addr.first_name,
                            last_name: addr.last_name,
                            phone: addr.phone,
                            shipping_street: addr.shipping_street,
                            shipping_city: addr.shipping_city,
                            shipping_postal_code: addr.shipping_postal_code,
                            shipping_province: addr.shipping_province || "Punjab",
                          });
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={addressSaving}
                        aria-label={`Delete address: ${title}`}
                        title="Delete address"
                        onClick={() => setAddressDeleteConfirmId(addr.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <input
            value={addressForm.first_name}
            onChange={(e) =>
              setAddressForm((p) => ({ ...p, first_name: e.target.value }))
            }
            placeholder="First name"
            className={inputClass}
          />
          <input
            value={addressForm.last_name}
            onChange={(e) =>
              setAddressForm((p) => ({ ...p, last_name: e.target.value }))
            }
            placeholder="Last name"
            className={inputClass}
          />
          <div className="sm:col-span-2">
            <ProfilePhoneField
              id="profile-address-phone"
              value={addressForm.phone}
              onChange={(next) =>
                setAddressForm((p) => ({ ...p, phone: next }))
              }
              disabled={addressSaving}
              lockCountry
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-start">
            <textarea
              value={addressForm.shipping_street}
              onChange={(e) =>
                setAddressForm((p) => ({
                  ...p,
                  shipping_street: e.target.value,
                }))
              }
              placeholder="Street address"
              disabled={addressSaving}
              className="min-h-[84px] w-full flex-1 resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={requestProfileAddressLocation}
              disabled={addressSaving || addressLocLoading}
              className="w-full shrink-0 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 sm:w-auto sm:max-w-[160px] sm:self-start"
            >
              {addressLocLoading ? "Locating…" : "Use my location"}
            </button>
          </div>
          {addressLocError ? (
            <p className="sm:col-span-2 text-xs text-red-600" role="alert">
              {addressLocError}
            </p>
          ) : null}
          <input
            value={addressForm.shipping_city}
            onChange={(e) =>
              setAddressForm((p) => ({ ...p, shipping_city: e.target.value }))
            }
            placeholder="City"
            className={inputClass}
          />
          <input
            value={addressForm.shipping_postal_code}
            onChange={(e) =>
              setAddressForm((p) => ({
                ...p,
                shipping_postal_code: e.target.value,
              }))
            }
            placeholder="Postal code"
            className={inputClass}
          />
          <input
            value={addressForm.shipping_province}
            onChange={(e) =>
              setAddressForm((p) => ({
                ...p,
                shipping_province: e.target.value,
              }))
            }
            placeholder="Province"
            className={inputClass}
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-neutral-800">
            Address label
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Pick how this address shows in your list and at checkout.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {ADDRESS_LABEL_OPTIONS.map((opt) => {
              const selected = addressLabelPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAddressLabelPreset(opt.id)}
                  className={`flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-md ring-1 ring-neutral-900/10"
                      : "border-neutral-200 bg-white text-neutral-800 shadow-sm hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                      selected
                        ? "bg-white/15 text-white"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <AddressLabelIcon variant={opt.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-semibold ${selected ? "text-white" : "text-neutral-900"}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] leading-snug ${
                        selected ? "text-white/75" : "text-neutral-500"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {addressLabelPreset === "custom" ? (
            <input
              value={addressLabelCustom}
              onChange={(e) => setAddressLabelCustom(e.target.value)}
              placeholder="e.g. Parents' house, Gym locker"
              className={`${inputClass} mt-3`}
            />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={addressSaving}
            onClick={async () => {
              const required = [
                addressForm.phone.trim(),
                addressForm.shipping_street.trim(),
                addressForm.shipping_city.trim(),
                addressForm.shipping_province.trim(),
              ];
              if (required.some((v) => !v)) {
                toast.error("Please fill required address fields.");
                return;
              }
              const wasEditingExisting = editingAddressId != null;
              setAddressSaving(true);
              try {
                const res = await fetch("/api/checkout/saved-addresses", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    address_id: editingAddressId ?? undefined,
                    label: effectiveAddressLabel,
                    first_name: addressForm.first_name.trim(),
                    last_name: addressForm.last_name.trim(),
                    phone: addressForm.phone.trim(),
                    shipping_street: addressForm.shipping_street.trim(),
                    shipping_city: addressForm.shipping_city.trim(),
                    shipping_postal_code:
                      addressForm.shipping_postal_code.trim(),
                    shipping_province: addressForm.shipping_province.trim(),
                    shipping_country: "PK",
                    set_default: false,
                  }),
                });
                const data = (await res.json()) as {
                  ok?: boolean;
                  address?: SavedAddress;
                };
                if (!res.ok || data.ok === false || !data.address) {
                  toast.error("Could not save address.");
                  return;
                }
                toast.success(
                  wasEditingExisting ? "Address updated." : "Address saved.",
                );
                await loadSavedAddresses();
                resetAddressEditor();
              } catch {
                toast.error("Could not save address.");
              } finally {
                setAddressSaving(false);
              }
            }}
            className="rounded-md bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {addressSaving
              ? "Saving…"
              : editingAddressId
                ? "Update Address"
                : "Save New Address"}
          </button>
          {editingAddressId ? (
            <button
              type="button"
              onClick={resetAddressEditor}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <ConfirmationModal
        open={addressDeleteConfirmId != null}
        onClose={() => setAddressDeleteConfirmId(null)}
        title="Delete this address?"
        description="It will be removed from your account and won't appear in your saved list at checkout."
        tone="danger"
        confirmLabel="Delete address"
        cancelLabel="Keep address"
        onConfirm={confirmDeleteProfileAddress}
        confirmDisabled={addressSaving}
      >
        {pendingDeleteAddressSummary ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-900">
              {pendingDeleteAddressSummary.title}
            </p>
            {pendingDeleteAddressSummary.line ? (
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                {pendingDeleteAddressSummary.line}
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmationModal>
    </>
  );
}
