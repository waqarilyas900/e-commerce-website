import { NextResponse } from "next/server";
import { loadStoreBrandFromDatabase } from "@/app/lib/store-brand-db";
import { getEnvLogoUrl } from "@/lib/site-brand-env";
import { getPublicSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function absolutizeFavicon(href: string, base: string): string {
  const t = href.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const origin = base.replace(/\/$/, "");
  if (t.startsWith("/")) return `${origin}${t}`;
  return `${origin}/${t}`;
}

/**
 * Served internally via rewrite from `/favicon.ico` so browsers and tools that
 * request the legacy path get the admin-configured asset instead of Next's default.
 */
export async function GET() {
  const envIcon = process.env.NEXT_PUBLIC_FAVICON_URL?.trim() ?? "";
  const brand = await loadStoreBrandFromDatabase();
  const raw = envIcon || getEnvLogoUrl() || brand.faviconUrl.trim();
  if (!raw) {
    return new NextResponse(null, { status: 404 });
  }
  const target = absolutizeFavicon(raw, getPublicSiteUrl());
  if (!target) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.redirect(target, 307);
}
