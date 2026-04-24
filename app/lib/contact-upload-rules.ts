import { sanitizeReviewStorageName } from "@/app/lib/review-upload-rules";

export const CONTACT_MAX_IMAGE_FILES = 5;
export const CONTACT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ContactImageValidationError = { fileName: string; message: string };

/** Validate optional contact screenshots (images only). */
export function validateContactImages(
  files: File[],
): { ok: true; files: File[] } | { ok: false; errors: ContactImageValidationError[] } {
  if (files.length === 0) {
    return { ok: true, files: [] };
  }
  if (files.length > CONTACT_MAX_IMAGE_FILES) {
    return {
      ok: false,
      errors: [
        {
          fileName: "",
          message: `You can attach at most ${CONTACT_MAX_IMAGE_FILES} images.`,
        },
      ],
    };
  }

  const errors: ContactImageValidationError[] = [];
  const out: File[] = [];

  for (const file of files) {
    const name = file.name || "image";
    if (!file.type || !ALLOWED_TYPES.has(file.type)) {
      errors.push({
        fileName: name,
        message: "Only JPEG, PNG, WebP, or GIF images are allowed.",
      });
      continue;
    }
    if (file.size > CONTACT_MAX_IMAGE_BYTES) {
      errors.push({
        fileName: name,
        message: `Each image must be ${CONTACT_MAX_IMAGE_BYTES / (1024 * 1024)} MB or smaller.`,
      });
      continue;
    }
    out.push(file);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, files: out };
}

export function safeContactStorageFileName(original: string): string {
  return sanitizeReviewStorageName(original);
}
