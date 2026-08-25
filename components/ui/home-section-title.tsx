"use client";

import type { ElementType, ReactNode } from "react";
import { RiseUpTitle } from "@/components/ui/rise-up-title";

/** Mobile display heading size — keep consistent across home rails, sections, and page titles. */
export const mobileHeadingSizeClass = "text-[1.50rem] leading-[1.2]";

/** Radstore-style home section titles (Kitchen / Shop collections / category rails, etc.). */
export const homeSectionTitleClass = `font-sans ${mobileHeadingSizeClass} font-black uppercase italic tracking-normal text-[#1c1d1d] sm:text-[29.7px] sm:leading-[35.64px]`;

/** Content page H1 — same mobile size, scales up from sm. */
export const pageHeroTitleClass = `${mobileHeadingSizeClass} font-semibold tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight`;

export const pageShellTitleClass = `${mobileHeadingSizeClass} font-semibold tracking-tight sm:text-3xl`;

type HomeSectionTitleProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
  /** When false, skip forced text-center (e.g. featured band copy column). */
  center?: boolean;
};

export function HomeSectionTitle({
  children,
  as: Tag = "h2",
  id,
  className = "",
  center = true,
}: HomeSectionTitleProps) {
  const Heading = Tag as ElementType;
  return (
    <RiseUpTitle className={center ? "text-center" : undefined}>
      <Heading
        id={id}
        className={`${homeSectionTitleClass}${className ? ` ${className}` : ""}`}
      >
        {children}
      </Heading>
    </RiseUpTitle>
  );
}
