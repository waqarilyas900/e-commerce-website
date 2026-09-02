import type { Metadata } from "next";
import { buildRoutePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildRoutePageMetadata("/auth/callback", {
    title: "Signing In",
    forceNoindex: true,
  });
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
