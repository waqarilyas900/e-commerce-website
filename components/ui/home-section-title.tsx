"use client";

import type { ElementType, ReactNode } from "react";
import { RiseUpTitle } from "@/components/ui/rise-up-title";

/** Radstore-style home section titles (Kitchen / Shop collections / H1, etc.). */
export const homeSectionTitleClass =
  "font-sans text-[1.65rem] font-black uppercase italic leading-[1.2] tracking-normal text-[#1c1d1d] sm:text-[29.7px] sm:leading-[35.64px]";

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
