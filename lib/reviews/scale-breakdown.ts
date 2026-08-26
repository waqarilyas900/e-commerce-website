export type StarBreakdown = {
  /** Index 0 = 5★ … index 4 = 1★ */
  counts: [number, number, number, number, number];
  total: number;
};

/**
 * Scale star-breakdown counts so they sum to `targetTotal` (homepage aggregate),
 * keeping the same proportions as the approved `reviews` table.
 */
export function scaleBreakdownToTotal(
  breakdown: StarBreakdown,
  targetTotal: number,
): StarBreakdown {
  const target = Math.max(0, Math.floor(targetTotal));
  if (target <= 0) return { counts: [0, 0, 0, 0, 0], total: 0 };
  if (breakdown.total <= 0) {
    return { counts: [target, 0, 0, 0, 0], total: target };
  }
  if (breakdown.total === target) return breakdown;

  const raw = breakdown.counts.map((c) => (c / breakdown.total) * target);
  const floored = raw.map((n) => Math.floor(n));
  let remainder = target - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  const counts: StarBreakdown["counts"] = [
    floored[0] ?? 0,
    floored[1] ?? 0,
    floored[2] ?? 0,
    floored[3] ?? 0,
    floored[4] ?? 0,
  ];
  for (const { i } of order) {
    if (remainder <= 0) break;
    counts[i] += 1;
    remainder -= 1;
  }
  return { counts, total: target };
}
