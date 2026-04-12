"use client";

import { useId, useMemo } from "react";
import Select, {
  type GroupBase,
  type Props as SelectProps,
  type StylesConfig,
} from "react-select";

/** Standard option shape for site-wide selects. */
export type AppSelectOption = { value: string; label: string };

const baseStyles: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 42,
    borderRadius: 8,
    borderColor: state.isFocused ? "#171717" : "#d4d4d8",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(23, 23, 23, 0.12)" : "none",
    backgroundColor: state.isDisabled ? "#fafafa" : "#ffffff",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    "&:hover": {
      borderColor: state.isFocused ? "#171717" : "#a3a3a3",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    paddingLeft: 12,
    paddingRight: 8,
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "0.875rem",
    color: "#171717",
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "0.875rem",
    color: "#737373",
  }),
  input: (provided) => ({
    ...provided,
    fontSize: "0.875rem",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow:
      "0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e5e5",
    marginTop: 4,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 4,
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "0.875rem",
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 6,
    backgroundColor: state.isSelected
      ? "#171717"
      : state.isFocused
        ? "#f5f5f5"
        : "transparent",
    color: state.isSelected ? "#ffffff" : "#171717",
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    paddingRight: 6,
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? "#171717" : "#525252",
    "&:hover": { color: "#171717" },
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

function mergeStyles(
  base: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>>,
  override?: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>>,
): StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> {
  if (!override) return base;
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override) as (keyof typeof override)[]) {
    const user = override[key];
    const baseFn = base[key];
    if (typeof user === "function" && typeof baseFn === "function") {
      merged[key as string] = (provided: unknown, state: unknown) =>
        (user as (a: unknown, b: unknown) => unknown)(
          (baseFn as (a: unknown, b: unknown) => unknown)(provided, state),
          state,
        );
    } else if (user !== undefined) {
      merged[key as string] = user;
    }
  }
  return merged as StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>>;
}

export type AppSelectProps = Omit<
  SelectProps<AppSelectOption, false, GroupBase<AppSelectOption>>,
  "styles" | "instanceId"
> & {
  styles?: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>>;
};

/**
 * Site-wide single-value select (react-select). Neutral styling aligned with form inputs.
 * Uses `menuPortalTarget={document.body}` + fixed positioning so dropdowns aren’t clipped.
 */
export function AppSelect({
  styles: stylesOverride,
  menuPortalTarget,
  menuPosition = "fixed",
  ...rest
}: AppSelectProps) {
  const id = useId();
  const instanceId = id.replace(/:/g, "");

  const styles = useMemo(
    () => mergeStyles(baseStyles, stylesOverride),
    [stylesOverride],
  );

  return (
    <Select<AppSelectOption, false, GroupBase<AppSelectOption>>
      instanceId={instanceId}
      styles={styles}
      menuPortalTarget={
        menuPortalTarget === undefined
          ? typeof document !== "undefined"
            ? document.body
            : null
          : menuPortalTarget
      }
      menuPosition={menuPosition}
      {...rest}
    />
  );
}
