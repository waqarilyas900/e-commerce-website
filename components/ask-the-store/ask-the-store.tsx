"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useAskTheStore } from "@/app/providers/ask-the-store-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { ModalShell } from "@/components/ui/modal-shell";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";

type Turn = { role: "user" | "assistant"; content: string };

const MAX_SEND_MESSAGES = 24;

/** Optional label from `.env`, e.g. which OpenRouter model backs the chat. */
const MODEL_LABEL = process.env.NEXT_PUBLIC_ASK_STORE_MODEL_LABEL?.trim();

export function AskTheStore() {
  const titleId = useId();
  const { storeName } = useStoreBrand();
  const { open, openAskStore, closeAskStore } = useAskTheStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, loading, scrollToBottom]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userTurn: Turn = { role: "user", content: text };
    const thread = [...messages, userTurn].slice(-MAX_SEND_MESSAGES);
    setMessages(thread);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/store-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: thread,
          storeName,
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const ok = data && typeof data === "object" && "ok" in data && (data as { ok?: boolean }).ok === true;
      const replyRaw =
        data && typeof data === "object" && "reply" in data
          ? (data as { reply: unknown }).reply
          : undefined;
      const reply = ok && typeof replyRaw === "string" ? replyRaw.trim() : "";
      const errMsg =
        !ok && data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : !res.ok
            ? "Something went wrong. Try again in a moment."
            : "";
      const devDetails =
        process.env.NODE_ENV === "development" &&
        data &&
        typeof data === "object" &&
        "details" in data &&
        typeof (data as { details?: unknown }).details === "string"
          ? (data as { details: string }).details.trim()
          : "";

      if (!res.ok || !reply) {
        const combined =
          errMsg || "We could not answer that right now.";
        setError(devDetails ? `${combined}\n\n(${devDetails})` : combined);
        return;
      }

      const assistantTurn: Turn = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantTurn].slice(-MAX_SEND_MESSAGES));
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, storeName]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => openAskStore()}
        className="fixed bottom-5 right-5 z-160 cursor-pointer rounded-full border border-neutral-200 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)] transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Ask store AI
      </button>

      <ModalShell
        open={open}
        onClose={closeAskStore}
        title="Ask store AI"
        subtitle={`${storeName} — questions about shopping here.`}
        titleId={titleId}
        maxWidthClassName="max-w-lg"
        zIndexClassName="z-[200]"
        footer={
          <div className="flex flex-col gap-3">
            {error ? (
              <p className="whitespace-pre-wrap text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <textarea
                id={`${titleId}-input`}
                name="ask-store-message"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                maxLength={4000}
                placeholder="e.g. How do I track an order?"
                className="min-h-[44px] min-w-0 flex-1 resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
              />
              <PrimaryActionButton
                type="button"
                loading={loading}
                disabled={!input.trim()}
                className="shrink-0 self-end"
                onClick={() => void send()}
              >
                Send
              </PrimaryActionButton>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500">
              Automated answers may be incomplete — double-check product pages, cart, and checkout for exact details.
              {MODEL_LABEL ? (
                <>
                  {" "}
                  Model: <span className="font-medium text-neutral-700">{MODEL_LABEL}</span>.
                </>
              ) : null}
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
            >
              Clear chat
            </button>
          </div>

          <div
            ref={listRef}
            className="flex max-h-[min(52dvh,420px)] min-h-[120px] flex-col gap-3 overflow-y-auto overscroll-contain pr-1"
          >
            {messages.length === 0 ? (
              <p className="text-sm leading-relaxed text-neutral-600">
                Ask about shipping, returns, finding a product, or what to check before checkout. We will answer here — no
                need to leave this window.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-neutral-900 text-white"
                      : "mr-auto border border-neutral-100 bg-neutral-50 text-neutral-900"
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}
            {loading ? (
              <div className="mr-auto rounded-2xl border border-neutral-100 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-500">
                Thinking…
              </div>
            ) : null}
          </div>
        </div>
      </ModalShell>
    </>
  );
}
