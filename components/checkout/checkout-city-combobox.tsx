"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  filterPakistanCities,
  findPakistanCity,
} from "@/app/lib/checkout-templates/pakistan-cities";

type Props = {
  id: string;
  value: string;
  onChange: (city: string) => void;
  /** When user picks a known city, suggest matching province. */
  onProvinceSuggest?: (province: string) => void;
  inputClassName: string;
  required?: boolean;
  placeholder?: string;
  error?: string | null;
};

export function CheckoutCityCombobox({
  id,
  value,
  onChange,
  onProvinceSuggest,
  inputClassName,
  required,
  placeholder = "City",
  error,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => filterPakistanCities(value, 8), [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickCity(name: string) {
    onChange(name);
    const hit = findPakistanCity(name);
    if (hit?.province) onProvinceSuggest?.(hit.province);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
            e.preventDefault();
            pickCity(suggestions[activeIndex]!.name);
          }
        }}
        className={inputClassName}
        autoComplete="address-level2"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((city, idx) => (
            <li key={city.name} role="option" aria-selected={idx === activeIndex}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                  idx === activeIndex ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickCity(city.name)}
              >
                <span className="font-medium text-neutral-900">{city.name}</span>
                <span className="text-xs text-neutral-500">{city.province}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
