import { redirect } from "next/navigation";

/** Legacy `/sale` → canonical `/collections/sale`. */
export default function SaleRedirectPage() {
  redirect("/collections/sale");
}
