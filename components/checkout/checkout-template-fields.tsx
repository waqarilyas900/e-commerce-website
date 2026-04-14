"use client";

import Link from "next/link";
import { ProfilePhoneField } from "@/components/account/profile-phone-field";
import type { CheckoutTemplateDef } from "@/app/lib/checkout-templates/types";

type Props = {
  template: CheckoutTemplateDef;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  inputClassName: string;
  /** Root stack spacing (default matches checkout: mt-8 between sections). */
  rootClassName?: string;
  phoneError?: string | null;
  locError?: string | null;
  locLoading?: boolean;
  onUseLocation?: () => void;
};

export function CheckoutTemplateFields({
  template,
  values,
  onChange,
  inputClassName,
  rootClassName = "mt-8 space-y-8",
  phoneError,
  locError,
  locLoading,
  onUseLocation,
}: Props) {
  return (
    <div className={rootClassName}>
      {template.sections.map((section) => (
        <section key={section.id}>
          {section.title === "Contact information" ? (
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold capitalize tracking-tight text-neutral-900">
                Contact
              </h3>
              <Link href="/login" className="text-xs font-semibold tracking-wide text-neutral-800 underline">
                Sign in
              </Link>
            </div>
          ) : (
            <h3 className="text-sm font-semibold capitalize tracking-tight text-neutral-900">
              {section.title}
            </h3>
          )}
          {section.description ? (
            <p className="mt-1 text-xs text-neutral-600">{section.description}</p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
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
                      onChange={(next) => {
                        onChange(field.id, next);
                      }}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Required for delivery updates (COD).
                    </p>
                    {phoneError ? (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {phoneError}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (field.type === "textarea") {
                const showLoc = field.meta?.locationButton && onUseLocation;
                return (
                  <div key={field.id} className={span}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <textarea
                        id={`co-${field.id}`}
                        required={field.required}
                        value={v}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        className={`min-h-[100px] flex-1 resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15`}
                        autoComplete={field.autoComplete}
                        placeholder={resolvedPlaceholder}
                      />
                      {showLoc ? (
                        <button
                          type="button"
                          onClick={onUseLocation}
                          disabled={locLoading}
                          className="w-full shrink-0 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 sm:w-auto sm:max-w-[160px] sm:self-start"
                        >
                          {locLoading ? "Locating…" : "Use my location"}
                        </button>
                      ) : null}
                    </div>
                    {field.meta?.locationButton && locError ? (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {locError}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.id} className={span}>
                    <select
                      id={`co-${field.id}`}
                      required={field.required}
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
                    required={field.required}
                    value={v}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    className={inputClassName}
                    autoComplete={field.autoComplete}
                    placeholder={resolvedPlaceholder}
                  />
                  {field.id === "email" ? (
                    <label className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
                      />
                      Email me with news and offers
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
          {section.id === "delivery" ? (
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
              />
              Save this information for next time
            </label>
          ) : null}
        </section>
      ))}
    </div>
  );
}
