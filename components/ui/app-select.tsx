"use client";

import { useId, useMemo } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type GroupBase,
  type OptionProps,
  type Props as SelectProps,
  type StylesConfig,
} from "react-select";

/** Standard option shape for site-wide selects. */
export type AppSelectOption = { value: string; label: string };

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: "transform 200ms ease, color 160ms ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        color: open ? "#111111" : "currentColor",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 opacity-95"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const baseStyles: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: state.isFocused
      ? "#111111"
      : state.menuIsOpen
        ? "#111111"
        : "#e5e5e5",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(17, 17, 17, 0.1)"
      : state.menuIsOpen
        ? "0 0 0 3px rgba(17, 17, 17, 0.06)"
        : "0 1px 2px rgba(17, 17, 17, 0.04)",
    backgroundColor: state.isDisabled
      ? "#fafafa"
      : state.menuIsOpen
        ? "#fafafa"
        : "#ffffff",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    transition:
      "border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
    "&:hover": {
      borderColor: state.isFocused || state.menuIsOpen ? "#111111" : "#a3a3a3",
      backgroundColor: state.isDisabled ? "#fafafa" : "#fafafa",
      boxShadow: state.isFocused
        ? "0 0 0 3px rgba(17, 17, 17, 0.1)"
        : "0 2px 8px rgba(17, 17, 17, 0.06)",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    paddingLeft: 14,
    paddingRight: 8,
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "0.875rem",
    fontWeight: 500,
    letterSpacing: "0.01em",
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
    borderRadius: 12,
    overflow: "hidden",
    boxShadow:
      "0 18px 48px -16px rgba(0, 0, 0, 0.22), 0 6px 16px rgba(0, 0, 0, 0.06)",
    border: "1px solid #ebebeb",
    marginTop: 8,
    backgroundColor: "#ffffff",
    animation: "app-select-menu-in 160ms cubic-bezier(0.22, 1, 0.36, 1)",
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 6,
    maxHeight: 280,
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "0.875rem",
    fontWeight: state.isSelected ? 600 : 500,
    padding: "11px 12px 11px 14px",
    cursor: "pointer",
    borderRadius: 8,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: state.isSelected
      ? "#111111"
      : state.isFocused
        ? "#f4f4f5"
        : "transparent",
    color: state.isSelected ? "#ffffff" : "#171717",
    boxShadow: state.isFocused && !state.isSelected
      ? "inset 3px 0 0 #111111"
      : "inset 3px 0 0 transparent",
    transition:
      "background-color 140ms ease, color 140ms ease, transform 140ms ease, box-shadow 140ms ease",
    transform: state.isFocused && !state.isSelected ? "translateX(2px)" : "none",
    "&:active": {
      backgroundColor: state.isSelected ? "#111111" : "#e7e7e7",
    },
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    paddingRight: 8,
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: 6,
    color: "#525252",
    transition: "color 160ms ease",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

function DropdownIndicator(
  props: DropdownIndicatorProps<AppSelectOption, false, GroupBase<AppSelectOption>>,
) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronIcon open={props.selectProps.menuIsOpen} />
    </components.DropdownIndicator>
  );
}

function Option(
  props: OptionProps<AppSelectOption, false, GroupBase<AppSelectOption>>,
) {
  const { isSelected, isFocused, children } = props;
  return (
    <components.Option {...props}>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {isSelected ? (
        <CheckIcon />
      ) : isFocused ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400"
        />
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 opacity-0" />
      )}
    </components.Option>
  );
}

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
  classNamePrefix = "app-select",
  components: componentsOverride,
  ...rest
}: AppSelectProps) {
  const id = useId();
  const instanceId = id.replace(/:/g, "");

  const styles = useMemo(
    () => mergeStyles(baseStyles, stylesOverride),
    [stylesOverride],
  );

  const mergedComponents = useMemo(
    () => ({
      DropdownIndicator,
      Option,
      ...componentsOverride,
    }),
    [componentsOverride],
  );

  return (
    <Select<AppSelectOption, false, GroupBase<AppSelectOption>>
      instanceId={instanceId}
      classNamePrefix={classNamePrefix}
      styles={styles}
      components={mergedComponents}
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
