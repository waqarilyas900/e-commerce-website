/**
 * Supabase Storage layout for the storefront.
 *
 * Bucket ID must match `storage.buckets.id` (see `20260412220000_storage_ecommerce_bucket.sql`).
 * Override with `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ID` if your project uses a different bucket name.
 *
 * Review attachments are public URLs stored in `public.reviews.media` as JSON:
 * `[{ "url": string, "kind": "image" | "video" }]`.
 *
 * Object keys: `{REVIEW_MEDIA_FOLDER}/{reviewId}/{timestamp}_{random}_{safeFileName}`
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeReviewStorageName,
  type ValidatedReviewFile,
} from "@/app/lib/review-upload-rules";

/** Public bucket for catalog / review media (migration default). */
export function getEcommerceStorageBucketId(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ID ?? "e-commerce-store";
}

/** First path segment under the bucket for product review uploads. */
export const REVIEW_MEDIA_FOLDER = "reviews" as const;

export type ReviewMediaStoredItem = {
  url: string;
  kind: "image" | "video";
};

/**
 * Storage object path (not a full URL). Safe for public buckets: use with `getPublicUrl`.
 */
export function buildReviewMediaObjectPath(reviewId: string, safeFileName: string): string {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${REVIEW_MEDIA_FOLDER}/${reviewId}/${unique}_${safeFileName}`;
}

/**
 * Upload validated review files and return the payload to persist on `reviews.media`.
 * Uses the bucket’s public URL base (bucket must remain `public` in Supabase).
 */
export async function uploadReviewMediaForReviewRow(
  supabase: SupabaseClient,
  reviewId: string,
  files: ValidatedReviewFile[],
): Promise<
  { ok: true; media: ReviewMediaStoredItem[] } | { ok: false; message: string; fileName?: string }
> {
  if (files.length === 0) {
    return { ok: true, media: [] };
  }

  const bucket = getEcommerceStorageBucketId();
  const media: ReviewMediaStoredItem[] = [];

  for (const { file, kind } of files) {
    const safe = sanitizeReviewStorageName(file.name);
    const path = buildReviewMediaObjectPath(reviewId, safe);

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (upErr) {
      return {
        ok: false,
        message: upErr.message,
        fileName: file.name,
      };
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub.publicUrl;
    if (!url) {
      return { ok: false, message: "Could not resolve public URL for uploaded file.", fileName: file.name };
    }

    media.push({ url, kind });
  }

  return { ok: true, media };
}
