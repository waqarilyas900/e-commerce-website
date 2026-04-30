import { GenericPageSkeleton } from "@/components/ui/route-skeletons";

/**
 * Root-level Suspense fallback. Streams immediately on every navigation while
 * the chosen page segment runs its server work. Combined with the top progress
 * bar in `app/layout.tsx`, this is what makes route changes feel instant.
 */
export default function Loading() {
  return <GenericPageSkeleton />;
}
