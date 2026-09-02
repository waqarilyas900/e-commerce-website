import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAccountWishlistItems } from "@/app/lib/wishlist-page";
import { WishlistPageClient } from "@/components/account/wishlist-page-client";

export default async function AccountWishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/account/wishlist");
  }

  const { items, error } = await loadAccountWishlistItems();

  return (
    <div className="w-full">
      <header className="border-b border-neutral-200/90 pb-8">
        <p className="text-xs font-normal capitalize tracking-wide text-neutral-500">
          <Link href="/account" className="hover:underline">
            Account
          </Link>{" "}
          / Wishlist
        </p>
        <h1 className="mt-2 text-[1.50rem] font-normal tracking-tight text-neutral-900 sm:text-3xl">
          Your wishlist
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Saved items from product pages. Add in-stock options to cart, or open a product to pick
          options when a SKU isn&apos;t ready yet.
        </p>
      </header>

      {error ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load your wishlist. Please try again later.
        </p>
      ) : (
        <WishlistPageClient initialItems={items} />
      )}
    </div>
  );
}
