import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Do not add a root `middleware.ts` next to this file — Next.js 16+ allows only `proxy.ts`. */

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
