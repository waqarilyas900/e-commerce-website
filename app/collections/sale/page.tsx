import { redirect } from "next/navigation";

/** Legacy sale route removed from indexable surface. */
export default function CollectionsSalePageRedirect() {
  redirect("/collections");
}
