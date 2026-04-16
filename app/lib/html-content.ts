/**
 * Whether HTML has no visible text (e.g. TipTap empty `<p></p>` or `<p><br></p>`).
 */
export function isEffectivelyEmptyHtml(html: string): boolean {
  const s = html.trim();
  if (!s) return true;
  const text = s
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}
