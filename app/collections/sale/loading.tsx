import { CollectionListingSkeleton } from "@/components/ui/route-skeletons";

export default function Loading() {
  return <CollectionListingSkeleton showSideNav count={9} />;
}
