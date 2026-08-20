/**
 * Rewrite bulky supplier CDN originals (esp. Daraz/Lazada) to sized WebP thumbnails.
 * Full `static-01.daraz.pk/p/*.jpg` files are often 200–800KB; lazcdn sized variants
 * are typically 15–40KB and are what Lighthouse "Improve image delivery" expects.
 */

const SIZED_ALREADY =
  /_\d+x\d+q\d+(\.jpg)?_\.webp$/i;

export type SupplierThumbEdge = 360 | 400 | 720 | 800;

export function optimizeSupplierImageUrl(
  raw: string | null | undefined,
  edge: SupplierThumbEdge = 400,
): string {
  const src = (raw ?? "").trim();
  if (!src) return "";
  if (SIZED_ALREADY.test(src)) return src;

  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return src;
  }

  const host = u.hostname.toLowerCase();
  const isDarazFamily =
    host.endsWith("daraz.pk") ||
    host.endsWith("lazcdn.com") ||
    host.includes("daraz.") ||
    host.includes("lazada.");
  if (!isDarazFamily) return src;

  // /p/{hash}.jpg  or  /static/pk/p/{hash}.jpg  (optional query stripped)
  const m = u.pathname.match(/\/p\/([a-f0-9]+)(\.[a-z0-9]+)?$/i);
  if (!m) return src;
  const hash = m[1];
  const ext = (m[2] || ".jpg").toLowerCase();
  return `https://img.drz.lazcdn.com/static/pk/p/${hash}${ext}_${edge}x${edge}q80.jpg_.webp`;
}
