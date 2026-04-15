/**
 * Per-product config for how variant dimensions render on the PDP.
 * Persisted in `public.product_option_definitions` (normalized rows).
 */

export type VariantOptionPresentation = "pills" | "swatches" | "badges" | "dropdown";

export type VariantOptionSchemaEntry = {
  /** Must match `product_variants.option_values` object key. */
  key: string;
  /** Heading shown above the picker on the PDP. */
  label: string;
  presentation: VariantOptionPresentation;
  sort_order: number;
};

/** Maps DB rows from `product_option_definitions` to the shared entry shape. */
export function optionDefinitionsFromDbRows(
  rows:
    | {
        option_key: string;
        label: string;
        presentation: string;
        sort_order: number;
      }[]
    | null
    | undefined,
): VariantOptionSchemaEntry[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const key = typeof r.option_key === "string" ? r.option_key.trim() : "";
      const pres = r.presentation;
      const presentation: VariantOptionPresentation =
        pres === "swatches" ||
        pres === "badges" ||
        pres === "dropdown" ||
        pres === "pills"
          ? pres
          : "pills";
      return {
        key,
        label:
          typeof r.label === "string" && r.label.trim() !== ""
            ? r.label.trim()
            : humanizeOptionKey(key),
        presentation,
        sort_order: r.sort_order,
      };
    })
    .filter((e) => e.key !== "");
}

export function parseVariantOptionSchema(raw: unknown): VariantOptionSchemaEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: VariantOptionSchemaEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    if (!key) continue;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const pres = o.presentation;
    const presentation: VariantOptionPresentation =
      pres === "swatches" ||
      pres === "badges" ||
      pres === "dropdown" ||
      pres === "pills"
        ? pres
        : "pills";
    const sort_order =
      typeof o.sort_order === "number" && Number.isFinite(o.sort_order)
        ? o.sort_order
        : out.length;
    out.push({
      key,
      label: label || humanizeOptionKey(key),
      presentation,
      sort_order,
    });
  }
  return out.sort((a, b) => a.sort_order - b.sort_order);
}

export function humanizeOptionKey(key: string): string {
  const t = key.trim();
  if (!t) return "";
  return t
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function defaultPresentationForKey(key: string): VariantOptionPresentation {
  const l = key.trim().toLowerCase();
  if (l === "color" || l === "colour") return "swatches";
  return "pills";
}

/** Union of option keys present on variants. */
export function collectOptionKeysFromVariants(
  optionValuesList: Record<string, string>[],
): string[] {
  const s = new Set<string>();
  for (const ov of optionValuesList) {
    for (const k of Object.keys(ov ?? {})) {
      if (k) s.add(k);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

/** Same logic as admin `mergeVariantKeysIntoSchema` — keep in sync. */
export function mergeVariantKeysIntoSchema(
  currentRows: VariantOptionSchemaEntry[],
  keysFromVariants: string[],
): VariantOptionSchemaEntry[] {
  const drafts = currentRows.filter((r) => !r.key.trim());
  const solid = currentRows.filter((r) => r.key.trim());
  const byKey = new Map<string, VariantOptionSchemaEntry>();
  for (const row of solid) {
    const k = row.key.trim();
    if (!byKey.has(k)) {
      byKey.set(k, { ...row, key: k });
    }
  }
  let maxOrder = [...byKey.values()].reduce((m, e) => Math.max(m, e.sort_order), -1);
  for (const vk of keysFromVariants) {
    if (!byKey.has(vk)) {
      maxOrder += 1;
      byKey.set(vk, {
        key: vk,
        label: humanizeOptionKey(vk),
        presentation: defaultPresentationForKey(vk),
        sort_order: maxOrder,
      });
    }
  }
  const merged = [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order);
  const reindexedDrafts = drafts.map((d, i) => ({
    ...d,
    sort_order: merged.length + i,
  }));
  return [...merged, ...reindexedDrafts];
}

export type ResolvedDimension = {
  key: string;
  label: string;
  presentation: VariantOptionPresentation;
  sort_order: number;
};

/**
 * Merge saved definitions with keys that exist on variants. Unknown keys get defaults.
 * Definition rows whose key is absent from any variant are dropped for rendering.
 */
export function resolveDimensionsForPdp(
  variantKeys: string[],
  schemaEntries: VariantOptionSchemaEntry[],
): ResolvedDimension[] {
  const parsed = [...schemaEntries].sort((a, b) => a.sort_order - b.sort_order);
  const variantKeySet = new Set(variantKeys);
  const fromSchema = parsed
    .filter((e) => variantKeySet.has(e.key))
    .map((e) => ({
      key: e.key,
      label: e.label || humanizeOptionKey(e.key),
      presentation: e.presentation,
      sort_order: e.sort_order,
    }));

  const seen = new Set(fromSchema.map((e) => e.key));
  let extraOrder = 0;
  const extras: ResolvedDimension[] = [];
  for (const k of [...variantKeys].sort((a, b) => a.localeCompare(b))) {
    if (seen.has(k)) continue;
    extras.push({
      key: k,
      label: humanizeOptionKey(k),
      presentation: defaultPresentationForKey(k),
      sort_order: 1000 + extraOrder++,
    });
  }

  return [...fromSchema, ...extras].sort((a, b) => a.sort_order - b.sort_order);
}
