"use client";

import type { CSSProperties } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Pakistan-only: hide country dropdown and keep +92 (react-international-phone). */
  lockCountry?: boolean;
};

/**
 * International phone input — default Pakistan (+92). Styled to match profile text inputs
 * (single border, no nested card). Value stored as E.164.
 */
export function ProfilePhoneField({ id, value, onChange, disabled, lockCountry }: Props) {
  return (
    <div
      className={`profile-phone-field w-full ${disabled ? "opacity-60" : ""}`}
      style={
        {
          "--react-international-phone-height": "42px",
          "--react-international-phone-border-radius": "0px",
          "--react-international-phone-border-color": "transparent",
          "--react-international-phone-background-color": "#ffffff",
          "--react-international-phone-font-size": "0.875rem",
          "--react-international-phone-text-color": "#171717",
          "--react-international-phone-dropdown-shadow":
            "0 10px 40px -10px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)",
          "--react-international-phone-selected-dropdown-item-background-color": "#f5f5f5",
        } as CSSProperties
      }
    >
      <PhoneInput
        defaultCountry="pk"
        preferredCountries={["pk"]}
        value={value}
        disabled={disabled}
        hideDropdown={lockCountry}
        disableCountryGuess={lockCountry}
        forceDialCode={lockCountry}
        placeholder="3XX XXX XXXX"
        name="phone"
        inputProps={{
          id,
          autoComplete: "tel",
          "aria-label": "Phone number",
        }}
        className="w-full! [&_.react-international-phone-input-container]:w-full!"
        inputClassName="!shadow-none !outline-none"
        countrySelectorStyleProps={{
          buttonClassName:
            "!m-0 !rounded-none !border-0 !bg-neutral-50 !shadow-none hover:!bg-neutral-100",
          dropdownStyleProps: {
            className: "z-300! rounded-lg! border! border-neutral-200! py-1! shadow-lg!",
          },
        }}
        onChange={(phone) => {
          onChange(phone);
        }}
      />
    </div>
  );
}
