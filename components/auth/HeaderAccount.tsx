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

const menuLinkClass =
  "block w-full px-3 py-2.5 text-left text-sm font-normal text-neutral-800 transition-colors hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none";

function displayUserFromSnapshot(snapshot: AuthDisplayCache): User {
  return {
    id: snapshot.userId,
    email: snapshot.email ?? undefined,
    user_metadata: snapshot.avatarUrl ? { avatar_url: snapshot.avatarUrl } : {},
  } as User;
}

export function HeaderAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, user, nameProfile, authReady, signOut } = useAuth();
  const [displaySnapshot, setDisplaySnapshot] = useState<AuthDisplayCache | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = "header-account-menu";

  /** Read sessionStorage only after mount so SSR HTML matches the first client paint. */
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

  /** Recovery / reset page: no avatar + name — not the normal “logged in” chrome. */
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
            <span className="hidden sm:inline">
              Password reset — enter your new password below
            </span>
          </>
        ) : (
          <>
            <span className="sm:hidden">
              <Link
                href="/reset-password"
                className="underline underline-offset-2"
              >
                Set new password
              </Link>
            </span>
            <span className="hidden sm:inline">
              <Link
                href="/reset-password"
                className="underline underline-offset-2"
              >
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
      <div className="flex min-w-0 max-w-full items-center justify-end">
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
              <span
                className={`relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 ring-2 transition hover:ring-neutral-300 sm:h-9 sm:w-9 ${menuOpen ? "ring-neutral-400" : "ring-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- OAuth avatar URLs (e.g. Google) vary by host */}
                <img
                  src={photo}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-900 text-[10px] font-semibold normal-case tracking-wide text-white ring-2 transition hover:ring-neutral-400 sm:h-9 sm:w-9 sm:text-[11px] ${menuOpen ? "ring-neutral-500" : "ring-transparent"}`}
              >
                {initials}
              </span>
            )}
            <span
              className="hidden min-w-0 max-w-30 truncate text-left text-xs font-normal text-neutral-700 sm:inline sm:max-w-40 md:max-w-56"
              title={name}
            >
              {name}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`hidden h-4 w-4 shrink-0 text-neutral-600 transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-[calc(100%+6px)] z-200 min-w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              <Link
                href="/account/profile"
                role="menuitem"
                className={menuLinkClass}
                onClick={closeMenu}
              >
                Profile
              </Link>
              <Link
                href="/account/orders"
                role="menuitem"
                className={menuLinkClass}
                onClick={closeMenu}
              >
                Order history
              </Link>
              <div
                className="my-1 border-t border-neutral-100"
                role="separator"
              />
              <button
                type="button"
                role="menuitem"
                className={`${menuLinkClass} text-neutral-700 cursor-pointer`}
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
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
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
