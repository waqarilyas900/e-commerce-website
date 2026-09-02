const STORAGE_KEY = "storefront-recently-viewed-v1";
const MAX_ITEMS = 12;

type RecentlyViewedEntry = {
  slug: string;
  viewedAt: number;
};

function readEntries(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is RecentlyViewedEntry =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as RecentlyViewedEntry).slug === "string" &&
          typeof (row as RecentlyViewedEntry).viewedAt === "number",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeEntries(entries: RecentlyViewedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode */
  }
}

/** Persist a PDP view (most recent first). Safe to call on every product mount. */
export function recordRecentlyViewed(slug: string): void {
  const normalized = slug.trim();
  if (!normalized) return;
  const filtered = readEntries().filter((e) => e.slug !== normalized);
  filtered.unshift({ slug: normalized, viewedAt: Date.now() });
  writeEntries(filtered);
}

/** Slugs for recently viewed products, optionally excluding the current PDP. */
export function getRecentlyViewedSlugs(excludeSlug?: string): string[] {
  const exclude = excludeSlug?.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of readEntries()) {
    const slug = entry.slug.trim();
    if (!slug || slug === exclude || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}
