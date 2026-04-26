/**
 * Inline JSON-LD as a server-rendered <script type="application/ld+json"> tag.
 *
 * - One block per JSON-LD graph; multiple JsonLd elements per page are allowed.
 * - Uses `dangerouslySetInnerHTML` because Next escapes JSX-rendered strings; we want
 *   raw JSON. Output is sanitized: closing `</script>` and `<!--` sequences are
 *   broken to prevent injection from any field that may carry user-edited HTML.
 */

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
  /** Optional, useful for React reconciliation when emitting multiple blocks. */
  id?: string;
};

function safeStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data, id }: JsonLdProps) {
  const json = safeStringify(data);
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
