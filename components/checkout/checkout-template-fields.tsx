"use client";

import Link from "next/link";
import { ProfilePhoneField } from "@/components/account/profile-phone-field";
import { CheckoutCityCombobox } from "@/components/checkout/checkout-city-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import type { CheckoutTemplateDef } from "@/app/lib/checkout-templates/types";
import type { SavedAddress } from "@/app/lib/saved-addresses";

type Props = {
  template: CheckoutTemplateDef;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  inputClassName: string;
  /** Root stack spacing (default matches checkout: mt-8 between sections). */
  rootClassName?: string;
  phoneError?: string | null;
  /** Soft hint when this phone placed an order in the last 24 hours. */
  duplicatePhoneWarning?: string | null;
  signedIn?: boolean;
  onRequestSignIn?: () => void;
  saveForNextTime?: boolean;
  onToggleSaveForNextTime?: (checked: boolean) => void;
  savedAddresses?: SavedAddress[];
  selectedSavedAddressId?: string | null;
  onSelectSavedAddress?: (id: string) => void;
  loadingSavedAddresses?: boolean;
  onEditSavedAddress?: (id: string) => void;
  onDeleteSavedAddress?: (id: string) => void;
  savingAddress?: boolean;
  saveAddressErrors?: Partial<Record<string, string>>;
};

export function CheckoutTemplateFields({
  template,
  values,
  onChange,
  inputClassName,
  rootClassName = "mt-8 space-y-8",
  phoneError,
  duplicatePhoneWarning,
  signedIn = false,
  onRequestSignIn,
  saveForNextTime = false,
  onToggleSaveForNextTime,
  savedAddresses = [],
  selectedSavedAddressId = null,
  onSelectSavedAddress,
  loadingSavedAddresses = false,
  savingAddress = false,
  saveAddressErrors = {},
}: Props) {
  return (
    <div className={rootClassName}>
      {template.sections.map((section) => {
        const visibleFields = section.fields.filter(
          (field) => signedIn || field.id !== "email",
        );

        return (
        <section key={section.id}>
          {section.title === "Contact information" ? (
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold capitalize tracking-tight text-neutral-900">
                Contact
              </h3>
              {signedIn ? (
                <span className="text-xs font-semibold tracking-wide text-emerald-700">Signed in</span>
              ) : onRequestSignIn ? (
                <button
                  type="button"
                  onClick={onRequestSignIn}
                  className="text-xs font-semibold tracking-wide text-neutral-800 underline"
                >
                  Sign in
                </button>
              ) : (
                <Link href="/login" className="text-xs font-semibold tracking-wide text-neutral-800 underline">
                  Sign in
                </Link>
              )}
            </div>
          ) : (
            <h3 className="text-sm font-semibold capitalize tracking-tight text-neutral-900">
              {section.title}
            </h3>
          )}
          {section.description ? (
            <p className="mt-1 text-xs text-neutral-600">{section.description}</p>
          ) : null}
          {visibleFields.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {visibleFields.map((field) => {
              const span = field.colSpan === 2 ? "sm:col-span-2" : "";
              const v = values[field.id] ?? "";
              const resolvedPlaceholder = field.placeholder ?? field.label;

              if (field.type === "country") {
                return (
                  <div key={field.id} className={span}>
                    <div
                      className={`${inputClassName} flex cursor-not-allowed items-center justify-between bg-neutral-50`}
                      aria-label="Country/Region"
                      title="Orders ship within Pakistan only"
                    >
                      <div className="leading-tight">
                        <p className="text-xs font-semibold tracking-wide text-neutral-500">Country/Region</p>
                        <p className="mt-0.5 text-sm text-neutral-900">Pakistan</p>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 text-neutral-500"
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                );
              }

              if (field.type === "phone") {
                return (
                  <div key={field.id} className={span}>
                    <ProfilePhoneField
                      id={`co-${field.id}`}
                      value={v}
                      lockCountry={field.meta?.lockCountry}
                      placeholder={field.placeholder}
                      onChange={(next) => {
                        onChange(field.id, next);
                      }}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Required for delivery updates (COD).
                    </p>
                    {saveAddressErrors[field.id] ? (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {saveAddressErrors[field.id]}
                      </p>
                    ) : null}
                    {phoneError ? (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {phoneError}
                      </p>
                    ) : null}
                    {!phoneError && duplicatePhoneWarning ? (
                      <p
                        className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                        role="status"
                      >
                        {duplicatePhoneWarning}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.id} className={span}>
                    <textarea
                      id={`co-${field.id}`}
                      required={signedIn ? field.required : field.id === "email" ? false : field.required}
                      value={v}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className={`min-h-[100px] w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15`}
                      autoComplete={field.autoComplete}
                      placeholder={resolvedPlaceholder}
                    />
                    {saveAddressErrors[field.id] ? (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {saveAddressErrors[field.id]}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (field.type === "city") {
                return (
                  <div key={field.id} className={span}>
                    <CheckoutCityCombobox
                      id={`co-${field.id}`}
                      value={v}
                      onChange={(next) => onChange(field.id, next)}
                      onProvinceSuggest={(province) => onChange("shipping_province", province)}
                      inputClassName={inputClassName}
                      required={
                        signedIn ? field.required : field.id === "email" ? false : field.required
                      }
                      placeholder={resolvedPlaceholder}
                      error={saveAddressErrors[field.id]}
                    />
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.id} className={span}>
                    <label htmlFor={`co-${field.id}`} className="sr-only">
                      {field.label}
                    </label>
                    <select
                      id={`co-${field.id}`}
                      required={signedIn ? field.required : field.id === "email" ? false : field.required}
                      value={v}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className={inputClassName}
                    >
                      {(field.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.id} className={span}>
                  <input
                    id={`co-${field.id}`}
                    type={field.type === "email" ? "email" : "text"}
                    required={signedIn ? field.required : field.id === "email" ? false : field.required}
                    value={v}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    className={inputClassName}
                    autoComplete={field.autoComplete}
                    placeholder={resolvedPlaceholder}
                  />
                  {saveAddressErrors[field.id] ? (
                    <p className="mt-2 text-xs text-red-600" role="alert">
                      {saveAddressErrors[field.id]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          ) : null}
          {section.id === "delivery" && signedIn ? (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-neutral-700">Saved addresses</p>
              {loadingSavedAddresses ? (
                <p className="mt-2 text-xs text-neutral-500">Loading your saved addresses…</p>
              ) : savedAddresses.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">
                  No saved addresses yet. Check the box below to save this one.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {savedAddresses.map((address, idx) => {
                    const title =
                      address.label.trim() || `Address ${String(idx + 1)}`;
                    const summary = [
                      address.shipping_street,
                      address.shipping_city,
                      address.shipping_province,
                      address.shipping_postal_code,
                    ]
                      .map((v) => v.trim())
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <Radio
                        key={address.id}
                        id={`checkout-saved-address-${address.id}`}
                        name="checkout-saved-address"
                        value={address.id}
                        checked={selectedSavedAddressId === address.id}
                        onChange={() => onSelectSavedAddress?.(address.id)}
                        align="start"
                        className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700"
                        label={
                          <>
                            <span className="block font-semibold text-neutral-900">{title}</span>
                            <span className="mt-0.5 block text-neutral-600">{summary}</span>
                          </>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          {section.id === "delivery" ? (
            <Checkbox
              className="mt-3 text-xs text-neutral-700"
              label={
                <>
                  Save this address for next time
                  {savingAddress ? (
                    <span className="ml-1 text-[11px] font-normal text-neutral-500">(Saving…)</span>
                  ) : null}
                </>
              }
              checked={saveForNextTime}
              onChange={(e) => onToggleSaveForNextTime?.(e.target.checked)}
            />
          ) : null}
        </section>
        );
      })}
    </div>
  );
}
