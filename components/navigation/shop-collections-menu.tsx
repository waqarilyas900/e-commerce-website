"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useNavCollections } from "@/app/providers/nav-collections-provider";

/** Shared style for primary header nav labels (Shop + dynamic header menu items). */
export const primaryNavLinkClass =
  "whitespace-nowrap text-sm font-normal text-neutral-950 transition-colors hover:text-black";

const collectionMenuItemClass =
  "block px-4 py-2.5 text-sm font-normal text-neutral-900 transition-colors hover:bg-neutral-50";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      className={`shrink-0 text-neutral-950 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** “Shop” label → `/collections`; chevron alone toggles the per-collection menu (no duplicate “All collections” in the menu). */
export function ShopCollectionsMenu() {
  const links = useNavCollections();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 220);
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const onCloseMega = () => setOpen(false);
    window.addEventListener("storefront:close-mega-menus", onCloseMega);
    return () => window.removeEventListener("storefront:close-mega-menus", onCloseMega);
  }, []);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <div className="flex items-center gap-0.5">
        <Link
          href="/collections"
          className={`${primaryNavLinkClass} rounded-md px-0.5 py-1`}
          onClick={() => {
            clearCloseTimer();
            setOpen(false);
          }}
        >
          Shop
        </Link>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center rounded-md p-1.5 text-neutral-950 hover:bg-neutral-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900/20"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-label={open ? "Close collections menu" : "Open collections menu"}
          title="Collections"
          onClick={() => setOpen((o) => !o)}
        >
          <Chevron open={open} />
        </button>
      </div>
      {open ? (
        <div
          id={menuId}
          className="absolute left-0 top-full z-50 mt-0.5 min-w-[240px] max-h-[min(70dvh,420px)] overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl"
          role="menu"
        >
          {links.length === 0 ? (
            <p className="px-4 py-3 text-sm text-neutral-500">No collections yet.</p>
          ) : (
            links.map((l) => (
              <Link
                key={l.slug}
                href={`/collections/${l.slug}`}
                className={collectionMenuItemClass}
                role="menuitem"
                onClick={() => {
                  clearCloseTimer();
                  setOpen(false);
                }}
              >
                {l.name}
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

