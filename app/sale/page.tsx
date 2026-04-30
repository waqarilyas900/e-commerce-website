import { redirect } from "next/navigation";

/** Legacy `/sale` route points to collections index. */
export default function SaleRedirectPage() {
  redirect("/collections");
}
