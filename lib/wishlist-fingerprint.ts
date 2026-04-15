/** Sorted keys + JSON string so the same PDP selection always matches one fingerprint. */

export function canonicalOptionJson(
  dimensionKeys: string[],
  selection: Record<string, string>,
): string {
  const sorted = [...new Set(dimensionKeys)].sort();
  const obj: Record<string, string> = {};
  for (const k of sorted) {
    obj[k] = (selection[k] ?? "").trim();
  }
  return JSON.stringify(obj);
}

/** Browser — SHA-256 hex; must match server `createHash` on `canonicalOptionJson` output. */
export async function clientOptionFingerprint(
  dimensionKeys: string[],
  selection: Record<string, string>,
): Promise<string> {
  const json = canonicalOptionJson(dimensionKeys, selection);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
