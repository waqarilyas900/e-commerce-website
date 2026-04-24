import type { SupabaseClient } from "@supabase/supabase-js";
import { safeContactStorageFileName } from "@/app/lib/contact-upload-rules";
import { getEcommerceStorageBucketId } from "@/lib/supabase/storage-config";

const CONTACT_FOLDER = "contact-inquiries" as const;

export function buildContactInquiryObjectPath(inquiryId: string, safeFileName: string): string {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${CONTACT_FOLDER}/${inquiryId}/${unique}_${safeFileName}`;
}

export type UploadedContactPath = { path: string; publicUrl: string };

/**
 * Upload contact inquiry images to the public e-commerce bucket (server-side, service role).
 */
export async function uploadContactInquiryImages(
  supabase: SupabaseClient,
  inquiryId: string,
  files: File[],
): Promise<
  { ok: true; uploads: UploadedContactPath[] } | { ok: false; message: string; fileName?: string }
> {
  if (files.length === 0) {
    return { ok: true, uploads: [] };
  }

  const bucket = getEcommerceStorageBucketId();
  const uploads: UploadedContactPath[] = [];

  for (const file of files) {
    const safe = safeContactStorageFileName(file.name);
    const path = buildContactInquiryObjectPath(inquiryId, safe);

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "86400",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

    if (upErr) {
      return { ok: false, message: upErr.message, fileName: file.name };
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    if (!publicUrl) {
      return { ok: false, message: "Could not resolve public URL for uploaded file.", fileName: file.name };
    }

    uploads.push({ path, publicUrl });
  }

  return { ok: true, uploads };
}

export async function removeContactInquiryObjects(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const bucket = getEcommerceStorageBucketId();
  await supabase.storage.from(bucket).remove(paths);
}
