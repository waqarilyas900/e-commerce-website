"use client";

import type { PublicSocialLink } from "@/lib/env/public-social";
import { getPublicSocialLinks } from "@/lib/env/public-social";

function SocialGlyph({ id }: { id: PublicSocialLink["id"] }) {
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (id === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M13.5 22v-8.2h2.7l.5-3.2H13.5V8.9c0-.9.3-1.5 1.6-1.5H17V4.4c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.6H7v3.2h2.8V22h3.7z" />
      </svg>
    );
  }
  if (id === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M16.5 3c.4 2.2 1.8 3.8 4 4.3v2.4c-1.4-.1-2.7-.6-3.8-1.4v6.6c0 3.4-2.7 6.1-6.1 6.1S4.5 18.3 4.5 14.9 7.2 8.8 10.6 8.8c.3 0 .7 0 1 .1v2.5c-.3-.1-.6-.2-1-.2-2 0-3.6 1.6-3.6 3.7s1.6 3.7 3.6 3.7 3.6-1.6 3.6-3.7V3h2.3z" />
      </svg>
    );
  }
  // whatsapp
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12.04 2.01c-5.5 0-9.96 4.45-9.96 9.94 0 1.75.46 3.45 1.33 4.95L2 22l5.27-1.38a9.93 9.93 0 0 0 4.77 1.22h.01c5.49 0 9.95-4.46 9.95-9.95 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0 0 12.04 2zm0 18.18h-.01a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.23 8.23 0 0 1-1.26-4.4c0-4.55 3.71-8.25 8.27-8.25 2.21 0 4.28.86 5.84 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.55-3.71 8.27-8.27 8.27zm4.53-6.18c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.24-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74 1.49.64 2.07.7 2.81.59.43-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
}

export function SocialIconLinks({
  className,
  iconClassName,
}: {
  className?: string;
  /** Per-icon button classes (footer vs drawer themes differ). */
  iconClassName: string;
}) {
  const links = getPublicSocialLinks();

  return (
    <div className={className}>
      {links.map((link) => {
        if (link.placeholder) {
          return (
            <span
              key={link.id}
              role="link"
              aria-label={`${link.label} (link coming soon)`}
              aria-disabled="true"
              title={`${link.label} — link coming soon`}
              className={`${iconClassName} cursor-default opacity-90`}
            >
              <SocialGlyph id={link.id} />
            </span>
          );
        }
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={iconClassName}
            aria-label={link.label}
          >
            <SocialGlyph id={link.id} />
          </a>
        );
      })}
    </div>
  );
}
