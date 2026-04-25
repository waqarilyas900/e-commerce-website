"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ModalShell } from "@/components/ui/modal-shell";

export type ConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Supporting copy (shown under the title). */
  description?: ReactNode;
  /** Optional body below the subtitle (e.g. a summary card). */
  children?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  /**
   * `danger` — red primary button for destructive actions.
   * `neutral` — dark neutral primary (confirmations that are not destructive).
   */
  tone?: "danger" | "neutral";
  /**
   * Called when the user confirms. If it resolves to anything other than `false`, the modal closes.
   * Return `false` (or reject) after a failed action to keep the dialog open.
   */
  onConfirm: () => void | false | Promise<void | false>;
  /** When true, disables actions (e.g. parent is already saving). */
  confirmDisabled?: boolean;
  /** @default true */
  showCloseButton?: boolean;
};

/**
 * Generic confirm / cancel dialog built on {@link ModalShell}.
 * Use for delete flows, irreversible actions, or any yes/no decision.
 */
export function ConfirmationModal({
  open,
  onClose,
  title,
  description,
  children,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  tone = "danger",
  onConfirm,
  confirmDisabled = false,
  showCloseButton = true,
}: ConfirmationModalProps) {
  const titleId = useId();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  const busy = pending || confirmDisabled;

  const guardedClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    setPending(true);
    try {
      const result = await Promise.resolve(onConfirm());
      if (result !== false) onClose();
    } catch {
      /* caller may toast; keep modal open */
    } finally {
      setPending(false);
    }
  }, [busy, onConfirm, onClose]);

  const confirmClass =
    tone === "danger"
      ? "rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
      : "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60";

  const footer = (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={guardedClose}
        disabled={busy}
        className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
      >
        {cancelLabel}
      </button>
      <button type="button" onClick={() => void handleConfirm()} disabled={busy} className={confirmClass}>
        {pending ? "Please wait…" : confirmLabel}
      </button>
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={guardedClose}
      title={title}
      subtitle={description}
      titleId={titleId}
      footer={footer}
      showCloseButton={showCloseButton && !busy}
      maxWidthClassName="max-w-md"
      overlayVerticalAlign="top"
    >
      {children != null && children !== false ? (
        <div className="text-sm text-neutral-700">{children}</div>
      ) : null}
    </ModalShell>
  );
}
