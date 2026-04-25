export type ConsumeOpenAiSseOptions = {
  /**
   * Yield to the browser after this many text deltas (default 2).
   * Set to 0 to disable yielding (fastest; React may batch many updates into one paint).
   */
  yieldEveryNDeltas?: number;
  /**
   * Also yield if this many ms passed since the last yield (helps when many deltas share one timestamp).
   * @default 24
   */
  minYieldIntervalMs?: number;
};

const yieldFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/**
 * Parses OpenAI-compatible SSE from OpenRouter (`data: {json}\n\n`, ends with `data: [DONE]`).
 * Invokes `onDelta` for each streamed `choices[0].delta.content` fragment.
 */
export async function consumeOpenAiSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (fragment: string) => void,
  options?: ConsumeOpenAiSseOptions,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  const yieldEvery = options?.yieldEveryNDeltas ?? 2;
  const minInterval = options?.minYieldIntervalMs ?? 24;
  let deltaCount = 0;
  let lastYield =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  /** @returns true when stream is finished (`[DONE]`). */
  const flushLine = async (line: string): Promise<boolean> => {
    const trimmed = line.replace(/\r/g, "").trimEnd();
    if (!trimmed.startsWith("data:")) return false;
    const data = trimmed.slice(5).trimStart();
    if (data === "[DONE]") return true;
    if (!data) return false;
    try {
      const j = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string | null } }>;
      };
      const piece = j.choices?.[0]?.delta?.content;
      if (typeof piece === "string" && piece.length > 0) {
        onDelta(piece);
        if (yieldEvery > 0) {
          deltaCount++;
          const now =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          const dueByCount = deltaCount % yieldEvery === 0;
          const dueByTime = now - lastYield >= minInterval;
          if (dueByCount || dueByTime) {
            lastYield = now;
            await yieldFrame();
          }
        }
      }
    } catch {
      /* ignore malformed chunk */
    }
    return false;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    const parts = carry.split(/\r?\n/);
    carry = parts.pop() ?? "";
    for (const line of parts) {
      if (await flushLine(line)) {
        await reader.cancel().catch(() => {});
        return;
      }
    }
  }

  if (carry.trim()) {
    for (const line of carry.split(/\r?\n/)) {
      if (await flushLine(line)) {
        await reader.cancel().catch(() => {});
        return;
      }
    }
  }
}
