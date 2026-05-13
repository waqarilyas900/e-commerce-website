import { googleAdsTxtBody } from "@/lib/seo/google-adsense";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(googleAdsTxtBody(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
