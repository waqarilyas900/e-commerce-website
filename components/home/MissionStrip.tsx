"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

type MissionStripProps = {
  /** Rich HTML from the admin editor (TipTap); sanitized before render. */
  missionHtml: string;
};

/** Client-only: avoids jsdom / isomorphic-dompurify SSR edge cases on serverless (e.g. Vercel). */
export function MissionStrip({ missionHtml }: MissionStripProps) {
  const safe = useMemo(() => {
    try {
      return DOMPurify.sanitize(missionHtml.trim(), {
        USE_PROFILES: { html: true },
      });
    } catch {
      return "";
    }
  }, [missionHtml]);

  if (!safe) return null;

  return (
    <section className="border-b border-neutral-200 bg-white py-8 sm:py-10">
      <ScrollReveal>
        <div
          className="mx-auto max-w-3xl shell-x text-center text-base leading-relaxed text-neutral-800 md:text-lg [&_a]:text-neutral-900 [&_a]:underline [&_blockquote]:mx-auto [&_blockquote]:max-w-prose [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-left [&_blockquote]:italic [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-sm [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:inline-block [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-left [&_p]:my-2 [&_pre]:rounded-md [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_pre]:text-sm [&_ul]:my-2 [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-left"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      </ScrollReveal>
    </section>
  );
}
