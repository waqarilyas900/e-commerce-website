/**
 * Inline wordmark so site Montserrat applies (external <img> SVGs cannot load page fonts).
 * viewBox is cropped to the glyph so empty SVG margins don't shrink the visible logo.
 */

type Variant = "dark" | "light";

const palette = {
  dark: {
    ink: "#1C1D1D",
    accent: "#E0703A",
    mute: "#6B6B68",
    wheelHole: "#FFFFFF",
  },
  light: {
    ink: "#FFFFFF",
    accent: "#E88A5A",
    mute: "#A9A9A6",
    wheelHole: "#1C1D1D",
  },
} as const;

/** Tight crop around icon + wordmark (stroke-safe). */
const VIEWBOX = "48 50 870 275";

export function WordmarkLogo({
  variant,
  className = "",
  title,
}: {
  variant: Variant;
  className?: string;
  title?: string;
}) {
  const c = palette[variant];
  return (
    <svg
      viewBox={VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title || "SimpleCart Store"}
    >
      {title ? <title>{title}</title> : null}
      <g transform="translate(0,10)">
        <path
          d="M60 90 H100 L128 124"
          fill="none"
          stroke={c.ink}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M128 124 L222 58 L316 124 L316 254 L128 254 Z"
          fill="none"
          stroke={c.ink}
          strokeWidth="14"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect x="192" y="187" width="52" height="67" rx="6" fill={c.accent} />
        <line
          x1="128"
          y1="191"
          x2="316"
          y2="191"
          stroke={c.ink}
          strokeWidth="11"
        />
        <circle cx="167" cy="288" r="22" fill={c.ink} />
        <circle cx="277" cy="288" r="22" fill={c.ink} />
        <circle cx="167" cy="288" r="7" fill={c.wheelHole} />
        <circle cx="277" cy="288" r="7" fill={c.wheelHole} />
      </g>
      <text
        x="380"
        y="205"
        fontFamily="inherit"
        fontWeight="600"
        fontSize="92"
        fill={c.ink}
      >
        Simple
        <tspan fill={c.accent}>Cart</tspan>
      </text>
      <text
        x="382"
        y="270"
        fontFamily="inherit"
        fontWeight="500"
        fontSize="40"
        letterSpacing="14"
        fill={c.mute}
      >
        STORE
      </text>
    </svg>
  );
}
