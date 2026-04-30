import { redirect } from "next/navigation";

/** Legacy bundles landing page removed. */
export default function BundlesPageRedirect() {
  redirect("/collections");
}
