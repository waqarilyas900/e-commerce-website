"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useAskTheStore } from "@/app/providers/ask-the-store-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useStickyProductVideoPresence } from "@/components/product/sticky-product-video-context";
import { consumeOpenAiSseStream } from "@/lib/store-ai-sse-client";
import { AssistantMarkdown } from "./assistant-markdown";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  streaming?: boolean;
};

function formatChatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function newTurn(role: "user" | "assistant", content: string): Turn {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

const MAX_SEND_MESSAGES = 24;

/** Fixed pump cadence; how much we reveal each tick follows SSE arrival rate (EMA). */
const TYPEWRITER_PUMP_MS = 28;
/** EMA smoothing for observed incoming chars/sec from OpenRouter/OpenAI-style deltas. */
const ARRIVAL_EMA_ALPHA = 0.42;
/** Ignore pathological gaps when scoring the first delta after idle (ms). */
const ARRIVAL_DT_FLOOR_MS = 12;
const ARRIVAL_DT_CEILING_MS = 900;
/** Clamp inferred stream speed so the UI stays readable and never stalls. */
const MIN_INFERRED_CHARS_PER_SEC = 14;
const MAX_INFERRED_CHARS_PER_SEC = 480;
/** Hard cap on graphemes advanced in one pump (layout cost). */
const MAX_GRAPHEMES_PER_TICK = 20;
/** If the network is this far ahead of the caret, bias harder toward catch-up. */
const CATCHUP_BACKLOG_CODE_UNITS = 120;
/** While streaming, only nudge scroll every N revealed graphemes (avoids scroll+layout every tick). */
const SCROLL_ON_PUMP_EVERY_N_GRAPHEMES = 10;
/** Only auto-scroll if the user is already near the bottom (avoids jitter while reading up-thread). */
const SCROLL_NEAR_BOTTOM_PX = 120;

/** `revealedLen` = length of prefix already shown; return new length after one grapheme. */
function advanceOneGrapheme(s: string, revealedLen: number): number {
  if (revealedLen >= s.length) return s.length;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let acc = 0;
    for (const { segment } of seg.segment(s)) {
      acc += segment.length;
      if (acc > revealedLen) return acc;
    }
    return s.length;
  }
  const cp = s.codePointAt(revealedLen);
  if (cp === undefined) return revealedLen + 1;
  return revealedLen + (cp > 0xffff ? 2 : 1);
}

/** Advance up to `maxSteps` graphemes; returns new revealed index (UTF-16 based, matches `advanceOneGrapheme`). */
function advanceNGraphemes(s: string, revealedLen: number, maxSteps: number): number {
  let r = revealedLen;
  const cap = Math.max(0, Math.floor(maxSteps));
  for (let i = 0; i < cap && r < s.length; i++) {
    r = advanceOneGrapheme(s, r);
  }
  return r;
}

const MODEL_LABEL = process.env.NEXT_PUBLIC_ASK_STORE_MODEL_LABEL?.trim();

const SUGGESTIONS = [
  "What products do you sell?",
  "Show me anything on sale",
  "How does shipping work?",
  "What is your return policy?",
] as const;

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

function ChatBubble({ message, reduceMotion }: { message: Turn; reduceMotion: boolean }) {
  const isUser = message.role === "user";
  const streamingAssistant = !isUser && Boolean(message.streaming);
  /**
   * While the assistant is streaming, layout projection is OFF on both shells so Framer does not
   * tween height on every grapheme (that overlapped the typewriter tick and caused flicker).
   * Height then follows normal browser reflow — the correct model for high-frequency text updates.
   */
  const layoutEnabled = isUser || !streamingAssistant;
  const spring = { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.88 };
  const soft = { duration: 0.22, ease: [0.33, 1, 0.68, 1] as const };

  return (
    <motion.div
      layout={layoutEnabled}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0.12 } : spring}
      className={`flex max-w-[90%] flex-col gap-1 ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
    >
      <motion.div
        layout={layoutEnabled}
        initial={streamingAssistant || reduceMotion ? undefined : { scale: 0.97 }}
        animate={{ scale: 1 }}
        transition={reduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 380, damping: 26 }}
        className={`overflow-hidden rounded-2xl shadow-md ${
          isUser
            ? "rounded-tr-md bg-neutral-900 text-white ring-1 ring-black/10"
            : "rounded-tl-md border border-neutral-200/90 bg-linear-to-b from-neutral-50 to-white text-neutral-900 ring-1 ring-neutral-900/5"
        }`}
      >
        {isUser ? (
          <motion.div
            className="px-4 py-2.5 text-sm leading-relaxed"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.1 } : { ...soft, delay: 0.04 }}
          >
            {message.content}
          </motion.div>
        ) : streamingAssistant ? (
          <div className="px-4 py-2.5 text-sm leading-relaxed">
            <div className="min-h-[1.35em] w-full min-w-0 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-neutral-900 wrap-anywhere [text-rendering:optimizeLegibility]">
              {message.content}
              {!reduceMotion ? (
                <span
                  className="ml-px inline-block h-[1.05em] w-[2px] animate-pulse rounded-[1px] bg-neutral-500 align-text-bottom"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        ) : (
          <motion.div
            key="assistant-md"
            className="px-4 py-2.5 text-sm leading-relaxed"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.33, 1, 0.68, 1] }}
          >
            <AssistantMarkdown content={message.content} />
          </motion.div>
        )}
        <div
          className={`border-t px-3 py-1.5 text-[10px] font-medium tabular-nums ${
            isUser ? "border-white/15 text-neutral-400" : "border-neutral-100 text-neutral-500"
          }`}
        >
          <time dateTime={message.createdAt}>{formatChatTimestamp(message.createdAt)}</time>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AskTheStore() {
  const pathname = usePathname();
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const { storeName } = useStoreBrand();
  const { open, openAskStore, closeAskStore } = useAskTheStore();
  const { visible: stickyVideoVisible } = useStickyProductVideoPresence();
  /** PDP has its own product UX; hide the floating launcher (chat still works if already open). */
  const isProductDetailPage = pathname.startsWith("/products/");
  const showFloatingUi = open || !isProductDetailPage;
  /** Sit left of the Rad-style sticky reel so both launchers stay usable on home. */
  const floatOffsetClass =
    stickyVideoVisible && !isProductDetailPage
      ? "bottom-5 right-[9.75rem] sm:right-[10.25rem]"
      : "bottom-5 right-5";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Cancels in-flight typewriter interval when clearing / erroring a streamed reply. */
  const revealSessionRef = useRef<{ cancel: () => void } | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  /** True while an assistant message is still typing — use instant scroll to avoid fighting layout. */
  const assistantStreamingRef = useRef(false);

  useEffect(() => {
    assistantStreamingRef.current = messages.some((m) => m.role === "assistant" && m.streaming);
  }, [messages]);

  const scheduleScrollToBottom = useCallback((options?: { force?: boolean }) => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = listRef.current;
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const shouldPin =
        Boolean(options?.force) || distFromBottom <= SCROLL_NEAR_BOTTOM_PX;
      if (!shouldPin) return;
      const top = Math.max(0, el.scrollHeight - el.clientHeight);
      const instant = reduceMotion || assistantStreamingRef.current;
      try {
        el.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
      } catch {
        el.scrollTop = top;
      }
    });
  }, [reduceMotion]);

  const streamingAssistant = messages.some((m) => m.role === "assistant" && m.streaming);
  const scrollStableKey = useMemo(() => {
    if (streamingAssistant) return "streaming";
    return messages.map((m) => `${m.id}:${m.content.length}:${m.streaming ? 1 : 0}`).join("|");
  }, [messages, streamingAssistant]);

  useEffect(() => {
    if (open) scheduleScrollToBottom();
  }, [open, loading, messages.length, scrollStableKey, scheduleScrollToBottom]);

  /** New turns (user send / assistant row) — always pin to bottom even if the user had scrolled up. */
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (!open) return;
    const n = messages.length;
    if (n > prevMessageCountRef.current) {
      scheduleScrollToBottom({ force: true });
    }
    prevMessageCountRef.current = n;
  }, [messages.length, open, scheduleScrollToBottom]);

  /** Sending a message shows the Typing row without changing `messages.length` (SSE) — still scroll. */
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (loading && !prevLoadingRef.current) {
      scheduleScrollToBottom({ force: true });
    }
    prevLoadingRef.current = loading;
  }, [loading, open, scheduleScrollToBottom]);

  /** Re-open always lands at the latest messages (smooth), not wherever scroll was left. */
  useEffect(() => {
    if (!open) return;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    const scrollToEnd = () => {
      const el = listRef.current;
      if (!el) return;
      const top = Math.max(0, el.scrollHeight - el.clientHeight);
      try {
        el.scrollTo({ top, behavior });
      } catch {
        el.scrollTop = top;
      }
    };
    let rafTail = 0;
    const rafHead = requestAnimationFrame(() => {
      rafTail = requestAnimationFrame(scrollToEnd);
    });
    const afterSpring = window.setTimeout(scrollToEnd, 320);
    return () => {
      cancelAnimationFrame(rafHead);
      cancelAnimationFrame(rafTail);
      window.clearTimeout(afterSpring);
    };
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") closeAskStore();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, closeAskStore]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      const userTurn = newTurn("user", text);
      /** Pre-generate id/timestamp; SSE adds the row on first token so "Typing" shows during TTFT. */
      const assistantStub = newTurn("assistant", "");
      const assistantId = assistantStub.id;
      const assistantCreatedAt = assistantStub.createdAt;
      const thread = [...messages, userTurn].slice(-MAX_SEND_MESSAGES);
      const apiMessages = thread.map(({ role, content }) => ({ role, content }));
      setMessages(thread);
      setInput("");
      setError(null);
      setLoading(true);

      revealSessionRef.current?.cancel();
      revealSessionRef.current = null;

      /** When true, `finally` skips `setLoading(false)` until the reveal loop finishes (SSE path). */
      let holdLoadingUntilReveal = false;

      const stripAssistant = () => {
        revealSessionRef.current?.cancel();
        revealSessionRef.current = null;
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      };

      try {
        const res = await fetch("/api/store-ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            storeName,
          }),
        });

        const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
        /** Prefer explicit SSE; otherwise accept unknown/empty types from our route (not JSON/HTML error bodies). */
        const treatAsSse =
          Boolean(res.body) &&
          (contentType.includes("text/event-stream") ||
            (!contentType.includes("application/json") && !contentType.includes("text/html")));

        const readJsonError = async (): Promise<{ errMsg: string; devDetails: string }> => {
          const data: unknown = await res.json().catch(() => null);
          const errMsg =
            data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : !res.ok
                ? "Something went wrong. Try again in a moment."
                : "We could not answer that right now.";
          const devDetails =
            process.env.NODE_ENV === "development" &&
            data &&
            typeof data === "object" &&
            "details" in data &&
            typeof (data as { details?: unknown }).details === "string"
              ? (data as { details: string }).details.trim()
              : "";
          return { errMsg, devDetails };
        };

        if (!res.ok) {
          const { errMsg, devDetails } = await readJsonError();
          stripAssistant();
          setError(devDetails ? `${errMsg}\n\n(${devDetails})` : errMsg);
          return;
        }

        if (treatAsSse && res.body) {
          holdLoadingUntilReveal = true;
          /**
           * Network fills `target`; `pump` reveals graphemes each tick at a rate tied to observed SSE
           * throughput (EMA), so fast model chunks read fast and sparse tokens read slowly.
           */
          const stream = {
            target: "",
            active: true,
            revealed: 0,
            lastScrollBucket: -1,
            /** First SSE text delta mounts the assistant bubble (until then, list shows "Typing"). */
            assistantRowMounted: false,
            /** Last SSE `onDelta` time — drives EMA of incoming chars/sec. */
            lastArrivalAt: Date.now(),
            /** Smoothed UTF-16 code units per second from the model stream. */
            arrivalEmaCharsPerSec: 38,
            typeIntervalId: null as ReturnType<typeof setInterval> | null,
          };

          const mountAssistantRowIfNeeded = () => {
            if (stream.assistantRowMounted) return;
            stream.assistantRowMounted = true;
            setMessages((prev) => {
              if (prev.some((m) => m.id === assistantId)) return prev;
              const next: Turn[] = [
                ...prev,
                {
                  id: assistantId,
                  role: "assistant" as const,
                  content: "",
                  createdAt: assistantCreatedAt,
                  streaming: true,
                },
              ];
              return next.slice(-MAX_SEND_MESSAGES);
            });
          };

          const cancelReveal = () => {
            if (stream.typeIntervalId != null) {
              clearInterval(stream.typeIntervalId);
              stream.typeIntervalId = null;
            }
          };

          revealSessionRef.current = { cancel: cancelReveal };

          const pump = () => {
            const target = stream.target;
            const rev = stream.revealed;
            const backlog = target.length - rev;

            if (backlog > 0) {
              const tickMs = TYPEWRITER_PUMP_MS;
              let ema = Math.max(MIN_INFERRED_CHARS_PER_SEC, stream.arrivalEmaCharsPerSec);
              ema = Math.min(MAX_INFERRED_CHARS_PER_SEC, ema);
              let nGraphemes = Math.max(1, Math.round((ema * tickMs) / 1000));
              if (backlog > CATCHUP_BACKLOG_CODE_UNITS) {
                nGraphemes = Math.max(nGraphemes, Math.ceil(backlog / 14));
              }
              nGraphemes = Math.min(MAX_GRAPHEMES_PER_TICK, nGraphemes);
              stream.revealed = advanceNGraphemes(target, rev, nGraphemes);
              const slice = target.slice(0, stream.revealed);
              setMessages((prev) => {
                if (!prev.some((m) => m.id === assistantId)) return prev;
                return prev.map((m) => (m.id === assistantId ? { ...m, content: slice } : m));
              });
              const scrollBucket = Math.floor(stream.revealed / SCROLL_ON_PUMP_EVERY_N_GRAPHEMES);
              if (scrollBucket !== stream.lastScrollBucket) {
                stream.lastScrollBucket = scrollBucket;
                scheduleScrollToBottom({ force: true });
              }
            }

            const caughtUp = stream.revealed >= stream.target.length;
            if (caughtUp && !stream.active) {
              cancelReveal();
              setMessages((prev) => {
                if (!prev.some((m) => m.id === assistantId)) return prev;
                return prev.map((m) =>
                  m.id === assistantId ? { ...m, content: stream.target, streaming: false } : m,
                );
              });
              setLoading(false);
              revealSessionRef.current = null;
            }
          };

          const startTypewriter = () => {
            if (stream.typeIntervalId != null) return;
            stream.typeIntervalId = setInterval(pump, TYPEWRITER_PUMP_MS);
          };

          await consumeOpenAiSseStream(
            res.body,
            (fragment) => {
              stream.target += fragment;
              mountAssistantRowIfNeeded();
              const nowArrival = Date.now();
              const rawDt = nowArrival - stream.lastArrivalAt;
              const dt = Math.min(
                ARRIVAL_DT_CEILING_MS,
                Math.max(ARRIVAL_DT_FLOOR_MS, rawDt),
              );
              const inst = Math.min(
                MAX_INFERRED_CHARS_PER_SEC,
                (fragment.length / dt) * 1000,
              );
              stream.arrivalEmaCharsPerSec =
                stream.arrivalEmaCharsPerSec * (1 - ARRIVAL_EMA_ALPHA) + inst * ARRIVAL_EMA_ALPHA;
              stream.lastArrivalAt = nowArrival;
              startTypewriter();
            },
            { yieldEveryNDeltas: 0 },
          );

          stream.active = false;

          if (!stream.target.trim()) {
            holdLoadingUntilReveal = false;
            cancelReveal();
            revealSessionRef.current = null;
            stripAssistant();
            setError("Empty response from the model.");
            return;
          }

          mountAssistantRowIfNeeded();
          queueMicrotask(() => {
            startTypewriter();
            pump();
          });
          return;
        }

        const data: unknown = await res.json().catch(() => null);
        const ok = data && typeof data === "object" && "ok" in data && (data as { ok?: boolean }).ok === true;
        const replyRaw =
          data && typeof data === "object" && "reply" in data ? (data as { reply: unknown }).reply : undefined;
        const reply = ok && typeof replyRaw === "string" ? replyRaw.trim() : "";
        if (!reply) {
          const errMsg =
            data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : "We could not answer that right now.";
          const devDetails =
            process.env.NODE_ENV === "development" &&
            data &&
            typeof data === "object" &&
            "details" in data &&
            typeof (data as { details?: unknown }).details === "string"
              ? (data as { details: string }).details.trim()
              : "";
          stripAssistant();
          setError(devDetails ? `${errMsg}\n\n(${devDetails})` : errMsg);
          return;
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === assistantId)) {
            return prev.map((m) =>
              m.id === assistantId ? { ...m, content: reply, streaming: false } : m,
            );
          }
          const next: Turn[] = [
            ...prev,
            {
              id: assistantId,
              role: "assistant" as const,
              content: reply,
              createdAt: new Date().toISOString(),
              streaming: false,
            },
          ];
          return next.slice(-MAX_SEND_MESSAGES);
        });
      } catch {
        holdLoadingUntilReveal = false;
        stripAssistant();
        setError("Network error. Check your connection and try again.");
      } finally {
        if (!holdLoadingUntilReveal) {
          setLoading(false);
        }
      }
    },
    [input, loading, messages, scheduleScrollToBottom, storeName],
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="ask-store-backdrop"
            type="button"
            aria-label="Close chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-220 cursor-pointer bg-black/25 backdrop-blur-[1px]"
            onClick={closeAskStore}
          />
        ) : null}
      </AnimatePresence>

      {showFloatingUi ? (
        <div
          className={`pointer-events-none fixed flex flex-col-reverse items-end gap-3 ${floatOffsetClass} ${
            open ? "z-221" : "z-150"
          }`}
        >
          <div className="pointer-events-auto">
            {open ? (
              <motion.button
                type="button"
                initial={false}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.94 }}
                onClick={closeAskStore}
                aria-label="Close Ask store AI"
                aria-expanded
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                <CloseIcon className="h-5 w-5" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => openAskStore()}
                className="cursor-pointer rounded-full border border-neutral-200 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)] transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
                aria-haspopup="dialog"
                aria-expanded={false}
              >
                Ask store AI
              </button>
            )}
          </div>

          <AnimatePresence>
            {open ? (
              <motion.div
                key="ask-store-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.85 }}
                className="pointer-events-auto flex h-[min(84dvh,660px)] w-[min(calc(100vw-1.5rem),30rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_48px_-8px_rgba(0,0,0,0.22)]"
                onClick={(e) => e.stopPropagation()}
              >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 shell-x py-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-neutral-900">
                    Ask store AI
                  </h2>
                  <p className="truncate text-xs text-neutral-500">{storeName}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close chat"
                  title="Close chat"
                  onClick={closeAskStore}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <CloseIcon className="h-[18px] w-[18px]" />
                </button>
              </header>

              <div
                ref={listRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth shell-x py-4"
              >
                <LayoutGroup>
                  <div className="flex min-h-full flex-col justify-end gap-3">
                    {messages.length === 0 && !loading ? (
                    <div className="flex flex-col gap-4">
                      <div className="mr-auto max-w-[92%] rounded-2xl rounded-tl-sm border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-800">
                        Hi — ask us about orders, delivery, or anything in the store.
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          Suggestions
                        </p>
                        <div className="flex flex-col gap-2">
                          {SUGGESTIONS.map((label) => (
                            <button
                              key={label}
                              type="button"
                              disabled={loading}
                              onClick={() => void sendMessage(label)}
                              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-left text-sm text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    ) : (
                      messages.map((m) => (
                        <ChatBubble key={m.id} message={m} reduceMotion={Boolean(reduceMotion)} />
                      ))
                    )}
                    {loading && !messages.some((m) => m.streaming) ? (
                    <motion.div
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={
                        reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 400, damping: 28 }
                      }
                      className="mr-auto flex max-w-[90%] flex-col items-start gap-1"
                    >
                      <div className="flex items-center gap-2 overflow-hidden rounded-2xl rounded-tl-md border border-neutral-200/90 bg-linear-to-b from-neutral-50 to-white px-4 py-3 text-sm text-neutral-500 shadow-md ring-1 ring-neutral-900/5">
                        <span className="inline-flex gap-0.5" aria-hidden>
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
                        </span>
                        <motion.span
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          Typing
                        </motion.span>
                      </div>
                    </motion.div>
                    ) : null}
                  </div>
                </LayoutGroup>
              </div>

              <footer className="shrink-0 border-t border-neutral-100 bg-neutral-50/95 shell-x pb-3 pt-3">
                {error ? (
                  <p className="mb-2 whitespace-pre-wrap rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-800" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    id={`${titleId}-input`}
                    name="ask-store-message"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={loading}
                    maxLength={4000}
                    placeholder="Message…"
                    className="max-h-36 min-h-[48px] min-w-0 flex-1 resize-y rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900/15 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                    onClick={() => void sendMessage()}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition hover:bg-neutral-800 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {loading ? (
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                    ) : (
                      <SendIcon className="h-[18px] w-[18px] -translate-x-px translate-y-px" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] leading-tight text-neutral-400">
                  AI answers may be imperfect — confirm details at checkout.
                </p>
                {process.env.NODE_ENV === "development" && MODEL_LABEL ? (
                  <p className="mt-0.5 text-center text-[10px] text-neutral-400">
                    Model: <span className="font-medium text-neutral-600">{MODEL_LABEL}</span>
                  </p>
                ) : null}
              </footer>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </>
  );
}
