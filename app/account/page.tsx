import Link from "next/link";

/** Customer area: profile and order history placeholders. */
export default function AccountPage() {
  return (
    <>
      <h1 className="text-[1.50rem] font-normal tracking-tight sm:text-3xl">Your account</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Manage your profile and view orders. Store management (inventory, admin) is handled in the
        separate admin app — not here.
      </p>

      <ul className="mt-10 grid gap-3 sm:max-w-md">
        <li>
          <Link
            href="/account/profile"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span className="text-sm font-normal text-neutral-900">Profile</span>
            <span className="mt-1 block text-sm text-neutral-600">
              Name, email (read-only), phone, gender, date of birth
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/account/orders"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span className="text-sm font-normal text-neutral-900">Order history</span>
            <span className="mt-1 block text-sm text-neutral-600">
              Line items, delivery, totals, and status timeline
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/account/wishlist"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span className="text-sm font-normal text-neutral-900">Wishlist</span>
            <span className="mt-1 block text-sm text-neutral-600">
              Saved products — add to cart when they&apos;re in stock
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
