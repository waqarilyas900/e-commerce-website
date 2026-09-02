import { redirect } from "next/navigation";

/** Short URL → account wishlist (sign-in required). */
export default function WishlistRedirectPage() {
  redirect("/account/wishlist");
}
