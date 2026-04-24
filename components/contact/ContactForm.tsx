"use client";

import {
  CONTACT_MAX_IMAGE_BYTES,
  CONTACT_MAX_IMAGE_FILES,
  validateContactImages,
} from "@/app/lib/contact-upload-rules";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";

type PendingFile = { file: File; previewUrl: string };

type ContactFormProps = {
  /** Lets the page swap hero copy when the user sees the confirmation. */
  onSentChange?: (sent: boolean) => void;
};

function SuccessCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ContactForm({ onSentChange }: ContactFormProps) {
  const formId = useId();
  const fileInputId = `${formId}-attachments`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);

  useEffect(() => {
    onSentChange?.(sent);
  }, [sent, onSentChange]);

  const revokePreviews = useCallback((list: PendingFile[]) => {
    list.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length === 0) return;

    const combined = [...pending.map((p) => p.file), ...list];
    const validated = validateContactImages(combined);
    if (!validated.ok) {
      const msg = validated.errors.map((x) => (x.fileName ? `${x.fileName}: ${x.message}` : x.message)).join(" ");
      setError(msg);
      return;
    }

    const next: PendingFile[] = [
      ...pending,
      ...list.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ];
    setPending(next);
  }

  function removeAt(index: number) {
    setPending((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
    setError(null);
  }

  function handleSendAnother() {
    setSent(false);
    setError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    const fileList = pending.map((p) => p.file);
    const validated = validateContactImages(fileList);
    if (!validated.ok) {
      const msg = validated.errors.map((x) => (x.fileName ? `${x.fileName}: ${x.message}` : x.message)).join(" ");
      setError(msg);
      return;
    }

    const outbound = new FormData();
    outbound.set("name", name);
    outbound.set("email", email);
    outbound.set("message", message);
    for (const f of fileList) {
      outbound.append("attachments", f);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: outbound,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Could not send. Try again or email us directly.");
        return;
      }
      revokePreviews(pending);
      setPending([]);
      setSent(true);
      form.reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const mb = CONTACT_MAX_IMAGE_BYTES / (1024 * 1024);

  const formShell =
    "rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] sm:p-8";

  return (
    <div className="mt-8">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="success"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            className={`${formShell} text-center`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 sm:h-16 sm:w-16">
              <SuccessCheckIcon className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              We&apos;ve received your message
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-base">
              Thanks for reaching out. Our team will review it and email you at the address you provided—usually
              within one business day.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <PrimaryActionButton type="button" onClick={handleSendAnother} className="w-full sm:w-auto">
                Send another message
              </PrimaryActionButton>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                Continue shopping
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
            className={`${formShell} space-y-5`}
          >
            {error ? (
              <p className="rounded-xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                required
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/40 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/40 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                minLength={10}
                className="min-h-32 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50/40 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                placeholder="How can we help?"
              />
            </div>

            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Screenshots (optional)</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    Up to {CONTACT_MAX_IMAGE_FILES} images — JPEG, PNG, WebP, or GIF, up to {mb} MB each.
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add images
                </button>
              </div>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                aria-label="Attach images"
                onChange={onPickFiles}
              />
              {pending.length > 0 ? (
                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite">
                  {pending.map((p, i) => (
                    <li
                      key={`${p.previewUrl}-${i}`}
                      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URLs */}
                      <img src={p.previewUrl} alt="" className="aspect-square w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black"
                        onClick={() => removeAt(i)}
                        aria-label={`Remove ${p.file.name}`}
                      >
                        Remove
                      </button>
                      <p className="truncate px-2 py-1.5 text-[10px] text-neutral-500" title={p.file.name}>
                        {p.file.name}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-neutral-500">No images attached.</p>
              )}
            </div>

            <div className="pt-1">
              <PrimaryActionButton type="submit" loading={loading} className="w-full sm:w-auto">
                {loading ? "Sending…" : "Send message"}
              </PrimaryActionButton>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
