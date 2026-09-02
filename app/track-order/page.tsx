import type { Metadata } from "next";
import { buildRoutePageMetadata } from "@/lib/seo";
import { TrackOrderPageClient } from "@/components/account/track-order-page-client";

export async function generateMetadata(): Promise<Metadata> {
  return buildRoutePageMetadata("/track-order", {
    title: "Track Order",
    description:
      "Track your SimpleCart Store order status with your order number and phone. Delivery updates for shoppers across Pakistan.",
  });
}

export default function TrackOrderPage() {
  return (
    <main id="MainContent" className="mx-auto max-w-7xl shell-x py-10 sm:py-14">
      <TrackOrderPageClient />
    </main>
  );
}
