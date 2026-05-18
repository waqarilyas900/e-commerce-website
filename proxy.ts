import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getPublicSiteUrl } from "@/lib/site-url";

/** Do not add a root `middleware.ts` next to this file — Next.js 16+ allows only `proxy.ts`. */

function isLocalHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "[::1]"
  );
}

function canonicalHostFromEnv(): string | null {
  try {
    return new URL(getPublicSiteUrl()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  // Enforce HTTPS + canonical host in production to avoid duplicate crawl
  // surfaces (`http://`, non-canonical host) and keep Page Experience clean.
  if (process.env.NODE_ENV === "production") {
    const source = request.nextUrl;
    const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const incomingHost = (hostHeader || source.hostname || "").split(":")[0].toLowerCase();
    const canonicalHost = canonicalHostFromEnv();
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = source.protocol === "https:" || forwardedProto === "https";
    const shouldRedirectToHttps = !isHttps && !isLocalHost(incomingHost);
    const shouldRedirectHost =
      Boolean(canonicalHost) &&
      !isLocalHost(incomingHost) &&
      incomingHost !== canonicalHost;

    if (shouldRedirectToHttps || shouldRedirectHost) {
      const target = new URL(request.url);
      target.protocol = "https:";
      if (canonicalHost) target.hostname = canonicalHost;
      target.port = "";
      return NextResponse.redirect(target, 301);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static crawlers + well-known files (ads.txt must be plain text for AdSense).
    "/((?!_next/static|_next/image|favicon.ico|ads\\.txt|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
