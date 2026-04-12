import { createHash, randomBytes } from "node:crypto";

/** Raw token sent once in email URL (64 hex chars). Never store this — only SHA-256. */
export function generateOpaqueResetTokenRaw(): string {
  return randomBytes(32).toString("hex");
}

export function hashOpaqueResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
