import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Legacy path. Canonical policy URLs are `/{slug}` (sitemap + footer).
 * Keep this route as a 308 so old links / Search Console URLs consolidate.
 */
export default async function PolicyDetailsRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
