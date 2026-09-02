import type { Metadata } from "next";
import { buildRoutePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildRoutePageMetadata("/checkout", {
    title: "Checkout",
    description: "Complete your order with cash on delivery across Pakistan.",
    forceNoindex: true,
  });
}

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
