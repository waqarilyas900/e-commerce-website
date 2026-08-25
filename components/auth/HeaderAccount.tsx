"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/app/providers/auth-provider";
import { readAuthDisplayCache, type AuthDisplayCache } from "@/lib/auth/auth-display-cache";
import { shouldUsePasswordRecoveryHeader } from "@/lib/auth/password-recovery-session";
import {
  avatarInitialsFromUser,
  avatarPhotoUrlFromUser,
  displayNameFromUser,
  type UserNameProfile,
} from "@/lib/auth/user-display-name";
import { NAV2_ACCENT } from "@/components/navigation/nav2-theme";

const menuLinkClass =
  "block w-full px-3.5 py-2.5 text-left text-[13px] font-normal text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A] focus:outline-none";

function displayUserFromSnapshot(snapshot: AuthDisplayCache): User {
  return {
    id: snapshot.userId,
    email: snapshot.email ?? undefined,
    user_metadata: snapshot.avatarUrl ? { avatar_url: snapshot.avatarUrl } : {},
  } as User;
}

function firstName(full: string): string {
  const t = full.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

/**
 * AliExpress-style account cluster for Nav 2:
 * “Hi, Name / Account” with hover panel (Sign in / Register or orders / profile).
 */
export function HeaderAccountV2() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, user, nameProfile, authReady, signOut } = useAuth();
  const [displaySnapshot, setDisplaySnapshot] = useState<AuthDisplayCache | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = "header-account-menu-v2";

  useEffect(() => {
    setDisplaySnapshot(readAuthDisplayCache());
  }, []);

  const effectiveUser =
    user ?? (displaySnapshot ? displayUserFromSnapshot(displaySnapshot) : null);
  const effectiveProfile: UserNameProfile | null =
    nameProfile ?? displaySnapshot?.nameProfile ?? null;
  const showLoadingPlaceholder = !authReady && !effectiveUser;

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setMenuOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setMenuOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) closeMenu();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  async function handleSignOut() {
    closeMenu();
    await signOut();
    router.refresh();
  }

  if (showLoadingPlaceholder) {
    return (
      <span className="hidden px-2 py-1 text-xs text-neutral-400 lg:inline">…</span>
    );
  }

  if (shouldUsePasswordRecoveryHeader(session, pathname)) {
    return (
      <Link
        href="/reset-password"
        className="px-2 text-[11px] font-medium text-neutral-600 underline-offset-2 hover:underline"
        style={{ color: NAV2_ACCENT }}
      >
        Set password
      </Link>
    );
  }

  const name = effectiveUser
    ? displayNameFromUser(effectiveUser, effectiveProfile)
    : "";
  const hi = effectiveUser ? `Hi, ${firstName(name)}` : "Sign in";
  const photo = effectiveUser
    ? avatarPhotoUrlFromUser(effectiveUser) ?? displaySnapshot?.avatarUrl ?? null
    : null;
  const initials = effectiveUser
    ? avatarInitialsFromUser(effectiveUser, effectiveProfile)
    : "";

  return (
    <div
      ref={wrapRef}
      className="relative hidden lg:block"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        id="header-account-trigger-v2"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-50"
        onClick={() => (menuOpen ? closeMenu() : openMenu())}
      >
        {effectiveUser && photo ? (
          <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" width={32} height={32} className="h-full w-full object-cover" />
          </span>
        ) : effectiveUser ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-neutral-900 text-[10px] font-semibold text-white">
            {initials}
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 shrink-0 text-neutral-800"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        )}
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="max-w-[7.5rem] truncate text-[12px] font-medium text-neutral-900">
            {hi}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-500">
            Account
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+4px)] z-[200] w-[260px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          {!effectiveUser ? (
            <>
              <div className="space-y-2 px-3 pb-2 pt-1">
                <Link
                  href="/login"
                  role="menuitem"
                  className="btn flex w-full items-center justify-center rounded-none text-white transition hover:opacity-95"
                  style={{ backgroundColor: NAV2_ACCENT }}
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
                <p className="text-center text-[12px] text-neutral-600">
                  New customer?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold hover:underline"
                    style={{ color: NAV2_ACCENT }}
                    onClick={closeMenu}
                  >
                    Register
                  </Link>
                </p>
              </div>
              <div className="my-1 border-t border-neutral-100" role="separator" />
              <Link href="/login?next=/account/orders" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                My Orders
              </Link>
              <Link href="/contact" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Help Center
              </Link>
            </>
          ) : (
            <>
              <div className="border-b border-neutral-100 px-3.5 pb-2.5 pt-1">
                <p className="truncate text-[13px] font-semibold text-neutral-900">{name}</p>
                <p className="truncate text-[11px] text-neutral-500">{effectiveUser.email}</p>
              </div>
              <Link href="/account/orders" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                My Orders
              </Link>
              <Link href="/account/profile" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Profile
              </Link>
              <Link href="/account" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Account settings
              </Link>
              <Link href="/contact" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Help Center
              </Link>
              <div className="my-1 border-t border-neutral-100" role="separator" />
              <button
                type="button"
                role="menuitem"
                className={`${menuLinkClass} w-full cursor-pointer`}
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Compact account control for mobile / sticky narrow layouts. */
export function HeaderAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, user, nameProfile, authReady, signOut } = useAuth();
  const [displaySnapshot, setDisplaySnapshot] = useState<AuthDisplayCache | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = "header-account-menu";

  useEffect(() => {
    setDisplaySnapshot(readAuthDisplayCache());
  }, []);

  const effectiveUser =
    user ?? (displaySnapshot ? displayUserFromSnapshot(displaySnapshot) : null);
  const effectiveProfile: UserNameProfile | null =
    nameProfile ?? displaySnapshot?.nameProfile ?? null;
  const showLoadingPlaceholder = !authReady && !effectiveUser;

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) closeMenu();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  async function handleSignOut() {
    closeMenu();
    await signOut();
    router.refresh();
  }

  if (showLoadingPlaceholder) {
    return (
      <span className="inline-flex items-center px-2 py-2 text-xs text-neutral-400 sm:px-2.5">
        …
      </span>
    );
  }

  if (shouldUsePasswordRecoveryHeader(session, pathname)) {
    const onResetPage = pathname === "/reset-password";
    return (
      <span
        className="max-w-36 truncate text-right text-[10px] font-medium leading-tight text-neutral-600 sm:max-w-72 sm:text-[11px]"
        title={
          onResetPage
            ? "Email verified — set your new password on this page"
            : "Finish setting your new password on the reset page"
        }
      >
        {onResetPage ? (
          <>
            <span className="sm:hidden">Reset password — use form ↓</span>
            <span className="hidden sm:inline">Password reset — enter your new password below</span>
          </>
        ) : (
          <>
            <span className="sm:hidden">
              <Link href="/reset-password" className="underline underline-offset-2">
                Set new password
              </Link>
            </span>
            <span className="hidden sm:inline">
              <Link href="/reset-password" className="underline underline-offset-2">
                Finish password reset
              </Link>{" "}
              (link from your email)
            </span>
          </>
        )}
      </span>
    );
  }

  if (effectiveUser) {
    const photo = avatarPhotoUrlFromUser(effectiveUser) ?? displaySnapshot?.avatarUrl ?? null;
    const initials = avatarInitialsFromUser(effectiveUser, effectiveProfile);
    const name = displayNameFromUser(effectiveUser, effectiveProfile);

    return (
      <div className="flex min-w-0 max-w-full items-center justify-end lg:hidden">
        <div ref={wrapRef} className="relative min-w-0 max-w-full shrink">
          <button
            type="button"
            id="header-account-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-full py-0.5 pl-0.5 pr-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:gap-2 sm:pr-2"
          >
            {photo ? (
              <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 sm:h-9 sm:w-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" width={36} height={36} className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-900 text-[10px] font-semibold text-white sm:h-9 sm:w-9 sm:text-[11px]">
                {initials}
              </span>
            )}
            <span className="hidden min-w-0 max-w-30 truncate text-left text-xs font-normal text-neutral-700 sm:inline sm:max-w-40" title={name}>
              {name}
            </span>
          </button>

          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-[calc(100%+6px)] z-200 min-w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              <Link href="/account/profile" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Profile
              </Link>
              <Link href="/account/orders" role="menuitem" className={menuLinkClass} onClick={closeMenu}>
                Order history
              </Link>
              <div className="my-1 border-t border-neutral-100" role="separator" />
              <button
                type="button"
                role="menuitem"
                className={`${menuLinkClass} cursor-pointer text-neutral-700`}
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      aria-label="Log in"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:hidden lg:gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
        aria-hidden
      >
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
      <span className="sr-only">Log in</span>
    </Link>
  );
}
