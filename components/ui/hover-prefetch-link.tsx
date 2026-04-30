"use client";

/**
 * Aggressive prefetch wrapper around <Link>.
 *
 * Next's default behaviour only prefetches links once they scroll into the
 * viewport, and even then defers the RSC payload until hover. On a busy grid
 * (product cards, header nav, footer chips) that's still a 200-400 ms gap on
 * the first hover. This component fires `router.prefetch()` the moment the
 * pointer touches the link — including `touchstart` on mobile so a tap also
 * triggers prefetch immediately. Combined with the cached catalog layer in
 * `lib/cache/catalog-data.ts`, hover-to-paint typically settles below 100 ms
 * on warm cache.
 *
 * Behaviour notes:
 * - We dedupe per-instance with a ref so the router only sees one prefetch
 *   call per link, no matter how many times the user hovers.
 * - We bail out for non-internal `href` values (mailto:, tel:, http://other).
 * - Defaults `prefetch={false}` so we don't double-prefetch on top of the
 *   automatic in-viewport prefetch — our hover handler does the work.
 *   Callers can opt back into in-viewport prefetch with `prefetch={true}`.
 */

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent, TouchEvent, FocusEvent } from "react";

type HoverPrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

function isInternalHref(href: LinkProps["href"]): boolean {
  if (typeof href === "string") {
    return href.startsWith("/") && !href.startsWith("//");
  }
  // UrlObject — assume internal.
  return true;
}

function hrefToString(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  // Best-effort serialization for UrlObject. Next's router.prefetch can take
  // a URL string; if the caller passed an object, fall back to its pathname.
  const path = href.pathname ?? "/";
  const query =
    typeof href.query === "string"
      ? href.query
      : href.query
        ? "?" +
          Object.entries(href.query)
            .filter(([, v]) => v != null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
  return `${path}${query}`;
}

export const HoverPrefetchLink = forwardRef<HTMLAnchorElement, HoverPrefetchLinkProps>(
  function HoverPrefetchLink(
    {
      href,
      onMouseEnter,
      onTouchStart,
      onFocus,
      prefetch = false,
      children,
      ...rest
    },
    ref,
  ) {
    const router = useRouter();
    const prefetched = useRef(false);

    const triggerPrefetch = useCallback(() => {
      if (prefetched.current) return;
      if (!isInternalHref(href)) return;
      prefetched.current = true;
      try {
        router.prefetch(hrefToString(href));
      } catch {
        // Next throws if the route is statically excluded from prefetch
        // (e.g. dynamic API). Silently ignore — navigation still works.
      }
    }, [href, router]);

    const handleMouseEnter = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        triggerPrefetch();
        onMouseEnter?.(event);
      },
      [onMouseEnter, triggerPrefetch],
    );

    const handleTouchStart = useCallback(
      (event: TouchEvent<HTMLAnchorElement>) => {
        triggerPrefetch();
        onTouchStart?.(event);
      },
      [onTouchStart, triggerPrefetch],
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLAnchorElement>) => {
        triggerPrefetch();
        onFocus?.(event);
      },
      [onFocus, triggerPrefetch],
    );

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onFocus={handleFocus}
        {...rest}
      >
        {children}
      </Link>
    );
  },
);
