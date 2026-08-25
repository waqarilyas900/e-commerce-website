"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ProductReviewPdpRow } from "@/app/lib/db/catalog";
import {
  REVIEW_MAX_FILES,
  validateReviewFiles,
  type ValidatedReviewFile,
} from "@/app/lib/review-upload-rules";
import { uploadReviewMediaForReviewRow } from "@/lib/supabase/storage-config";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { ModalShell } from "@/components/ui/modal-shell";
import { STAR_EMPTY_COLOR, STAR_FILLED_CLASS, StarRating } from "@/components/ui/star-rating";

const OPEN_REVIEW_SESSION_KEY = "openReviewAfterAuth";
const OPEN_REVIEW_QUERY = "openReview";

type Props = {
  productId: string;
  /** Aggregates from `products` (approved-only after moderation). */
  rating: number;
  reviewsCount: number;
  initialReviews: ProductReviewPdpRow[];
  /** Optional 5★→1★ counts (e.g. synced from marketplace). When set, histogram uses this. */
  ratingBreakdown?: number[] | null;
};

function Stars({ value }: { value: number }) {
  return <StarRating value={value} labeled />;
}

function RatingPicker({
  value,
  onChange,
  labelId,
}: {
  value: number;
  onChange: (n: number) => void;
  labelId: string;
}) {
  return (
    <div className="flex flex-wrap gap-0.5" role="radiogroup" aria-labelledby={labelId}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={`cursor-pointer rounded p-0.5 leading-none transition ${
              active ? STAR_FILLED_CLASS : "text-neutral-300 hover:text-amber-300"
            }`}
            onClick={() => onChange(n)}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" className="shrink-0" fill="currentColor" aria-hidden>
              <path
                fill={active ? "currentColor" : STAR_EMPTY_COLOR}
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Histogram: index 0 = 5★ … index 4 = 1★ */
function starHistogram(approved: ProductReviewPdpRow[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of approved) {
    const s = Math.max(1, Math.min(5, Math.round(r.rating)));
    counts[5 - s] += 1;
  }
  return counts;
}

function emptyReviewForm() {
  return {
    rating: 5,
    title: "",
    content: "",
  };
}

const REVIEWS_PER_PAGE = 6;

/** Prefer YYYY-MM-DD title; else format created_at. Hide legacy `daraz:` titles. */
function reviewDateLabel(r: ProductReviewPdpRow): string {
  const title = (r.title || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(title)) return title;
  if (title && !title.startsWith("daraz:")) return title;
  const d = new Date(r.created_at);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PendingAttachment = {
  id: string;
  file: File;
  kind: "image" | "video";
  previewUrl: string;
};

function newAttachmentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type AuthUserForReviewProfile = {
  id: string;
  email?: string | null;
  user_metadata?: unknown;
};

function readMetaString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

function authUserReviewName(user: AuthUserForReviewProfile): {
  first: string;
  last: string;
  displayName: string;
} {
  const meta =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  let first = readMetaString(meta, "first_name") || readMetaString(meta, "given_name");
  let last = readMetaString(meta, "last_name") || readMetaString(meta, "family_name");

  if (!first && !last) {
    const full = readMetaString(meta, "full_name") || readMetaString(meta, "name");
    if (full) {
      const [head, ...tail] = full.split(/\s+/).filter(Boolean);
      first = head ?? "";
      last = tail.join(" ");
    }
  }

  const displayName = [first, last].filter(Boolean).join(" ").trim();
  return { first, last, displayName };
}

async function ensureReviewUserProfile(
  supabase: ReturnType<typeof createClient>,
  user: AuthUserForReviewProfile,
): Promise<{ id: string | null; displayName: string; changed: boolean; error?: string }> {
  const fromAuth = authUserReviewName(user);
  const fallbackLabel = fromAuth.displayName || user.email?.trim() || "Your account";
  const { data: row, error: lookupError } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return { id: null, displayName: fallbackLabel, changed: false, error: lookupError.message };
  }

  if (!row?.id) {
    const { error: upsertErr } = await supabase.from("users").upsert(
      {
        auth_id: user.id,
        first_name: fromAuth.first,
        last_name: fromAuth.last,
        phone: "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_id" },
    );
    if (upsertErr) {
      return { id: null, displayName: fallbackLabel, changed: false, error: upsertErr.message };
    }
    const { data: created, error: refetchErr } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    return {
      id: created?.id ?? null,
      displayName: fallbackLabel,
      changed: Boolean(fromAuth.displayName),
      error: refetchErr?.message,
    };
  }

  const currentFirst = typeof row.first_name === "string" ? row.first_name.trim() : "";
  const currentLast = typeof row.last_name === "string" ? row.last_name.trim() : "";
  const nextFirst = currentFirst || fromAuth.first;
  const nextLast = currentLast || fromAuth.last;
  const changed = nextFirst !== currentFirst || nextLast !== currentLast;

  if (changed) {
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        first_name: nextFirst,
        last_name: nextLast,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updateErr) {
      return { id: row.id, displayName: fallbackLabel, changed: false, error: updateErr.message };
    }
  }

  const displayName = [nextFirst, nextLast].filter(Boolean).join(" ").trim() || fallbackLabel;
  return { id: row.id, displayName, changed };
}

function CustomerReviewsInner({
  productId,
  rating,
  reviewsCount,
  initialReviews,
  ratingBreakdown = null,
}: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviews, setReviews] = useState<ProductReviewPdpRow[]>(initialReviews);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [form, setForm] = useState(emptyReviewForm);
  const [submitting, setSubmitting] = useState(false);
  const [postingHint, setPostingHint] = useState<string>("");
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);
  /** Thumbnails shown on the thank-you step after a successful submit. */
  const [submittedMediaPreview, setSubmittedMediaPreview] = useState<
    { url: string; kind: "image" | "video" }[]
  >([]);
  /** Local picks with blob previews before submit (revoked on remove / modal close). */
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const shouldRefreshOnCloseRef = useRef(false);
  const syncedSignedInProfileRef = useRef(false);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  useEffect(() => {
    if (syncedSignedInProfileRef.current) return;
    syncedSignedInProfileRef.current = true;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const synced = await ensureReviewUserProfile(supabase, user);
      if (!cancelled && synced.changed) {
        router.refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const approvedOnly = useMemo(
    () => reviews.filter((r) => r.status === "approved"),
    [reviews],
  );

  const sortedApproved = useMemo(() => {
    return [...approvedOnly].sort((a, b) => {
      const aImg = a.media?.length ? 1 : 0;
      const bImg = b.media?.length ? 1 : 0;
      if (bImg !== aImg) return bImg - aImg;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [approvedOnly]);

  const reviewPageCount = Math.max(1, Math.ceil(sortedApproved.length / REVIEWS_PER_PAGE));
  const safeReviewPage = Math.min(reviewPage, reviewPageCount);
  const pagedReviews = useMemo(() => {
    const start = (safeReviewPage - 1) * REVIEWS_PER_PAGE;
    return sortedApproved.slice(start, start + REVIEWS_PER_PAGE);
  }, [sortedApproved, safeReviewPage]);

  useEffect(() => {
    setReviewPage(1);
  }, [productId, initialReviews]);

  const displayRating = Number.isFinite(rating) ? rating : 0;
  const hasReviewsAggregate = reviewsCount > 0;
  const dist = useMemo(() => {
    if (
      Array.isArray(ratingBreakdown) &&
      ratingBreakdown.length === 5 &&
      ratingBreakdown.every((n) => Number.isFinite(Number(n)))
    ) {
      return ratingBreakdown.map((n) => Math.max(0, Math.round(Number(n))));
    }
    return starHistogram(approvedOnly);
  }, [ratingBreakdown, approvedOnly]);
  const maxDist = Math.max(1, ...dist);

  const nextPathWithReviewFlag = useMemo(() => {
    const base = pathname.startsWith("/") ? pathname : "/";
    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}${OPEN_REVIEW_QUERY}=1`;
  }, [pathname]);

  const openReviewModalAndReset = useCallback(() => {
    shouldRefreshOnCloseRef.current = false;
    setReviewSubmitSuccess(false);
    setSubmittedMediaPreview([]);
    setPendingAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
    setForm(emptyReviewForm());
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReviewModalOpen(true);
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPostingHint("");
        return;
      }
      const profile = await ensureReviewUserProfile(supabase, user);
      setPostingHint(profile.displayName);
    })();
  }, []);

  const closeSignInModal = useCallback(() => {
    try {
      sessionStorage.removeItem(OPEN_REVIEW_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSignInModalOpen(false);
  }, []);

  const closeReviewModal = useCallback(() => {
    if (shouldRefreshOnCloseRef.current) {
      shouldRefreshOnCloseRef.current = false;
      router.refresh();
    }
    setReviewSubmitSuccess(false);
    setSubmittedMediaPreview([]);
    setPendingAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
    setReviewModalOpen(false);
    setForm(emptyReviewForm());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [router]);

  useEffect(() => {
    if (!reviewSubmitSuccess || !reviewModalOpen) return;

    const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) return;

    let cancelled = false;
    const timeouts: number[] = [];

    void import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const zIndex = 260;
      const colors = ["#22c55e", "#eab308", "#3b82f6", "#ec4899", "#f97316", "#a855f7"];
      const burst = (origin: { x: number; y: number }, particleCount = 90, spread = 72) => {
        void confetti({
          particleCount,
          spread,
          origin,
          colors,
          zIndex,
          disableForReducedMotion: true,
        });
      };

      const outer = window.setTimeout(() => {
        if (cancelled) return;
        burst({ x: 0.12, y: 0.7 });
        burst({ x: 0.5, y: 0.55 }, 110, 85);
        burst({ x: 0.88, y: 0.7 });
        void confetti({
          particleCount: 140,
          spread: 100,
          origin: { x: 0.5, y: 0.48 },
          colors,
          zIndex,
          scalar: 1.05,
          disableForReducedMotion: true,
        });
        timeouts.push(
          window.setTimeout(() => {
            if (cancelled) return;
            void confetti({
              particleCount: 70,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.68 },
              colors,
              zIndex,
              disableForReducedMotion: true,
            });
            void confetti({
              particleCount: 70,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.68 },
              colors,
              zIndex,
              disableForReducedMotion: true,
            });
          }, 180),
        );
      }, 30);
      timeouts.push(outer);
    });

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, [reviewSubmitSuccess, reviewModalOpen]);

  useEffect(() => {
    const flag = searchParams.get(OPEN_REVIEW_QUERY);
    if (flag !== "1") return;

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      openReviewModalAndReset();
      router.replace(pathname, { scroll: false });
    });
  }, [searchParams, pathname, router, openReviewModalAndReset]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      try {
        if (sessionStorage.getItem(OPEN_REVIEW_SESSION_KEY) !== "1") return;
      } catch {
        return;
      }
      sessionStorage.removeItem(OPEN_REVIEW_SESSION_KEY);
      setSignInModalOpen(false);
      openReviewModalAndReset();
    });
    return () => subscription.unsubscribe();
  }, [openReviewModalAndReset]);

  async function onWriteReviewClick() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      openReviewModalAndReset();
      return;
    }
    try {
      sessionStorage.setItem(OPEN_REVIEW_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setSignInModalOpen(true);
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  function onPendingMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Snapshot files before clearing the input — clearing `value` empties the live FileList in browsers.
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    const validated = validateReviewFiles(picked);
    if (!validated.ok) {
      for (const err of validated.errors) {
        toast.error(err.fileName ? `${err.fileName}: ${err.message}` : err.message);
      }
      return;
    }
    setPendingAttachments((prev) => {
      const room = REVIEW_MAX_FILES - prev.length;
      if (room <= 0) {
        toast.error(`You can attach at most ${REVIEW_MAX_FILES} files.`);
        return prev;
      }
      const slice = validated.files.slice(0, room);
      if (validated.files.length > room) {
        toast.info(`Only ${room} more file(s) added (max ${REVIEW_MAX_FILES}).`);
      }
      const added: PendingAttachment[] = slice.map((vf: ValidatedReviewFile) => ({
        id: newAttachmentId(),
        file: vf.file,
        kind: vf.kind,
        previewUrl: URL.createObjectURL(vf.file),
      }));
      return [...prev, ...added];
    });
  }

  async function onSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const validatedFiles: ValidatedReviewFile[] = pendingAttachments.map((a) => ({
      file: a.file,
      kind: a.kind,
    }));

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to submit a review.");
        return;
      }

      const profile = await ensureReviewUserProfile(supabase, user);
      if (profile.error) {
        toast.error(profile.error);
        return;
      }

      if (!profile.id) {
        toast.error("Could not resolve your profile. Try again.");
        return;
      }
      const publicReviewerName =
        profile.displayName &&
        profile.displayName !== user.email?.trim() &&
        profile.displayName !== "Your account"
          ? profile.displayName
          : null;

      const { data: inserted, error: insErr } = await supabase
        .from("reviews")
        .insert({
          product_id: productId,
          user_id: profile.id,
          attributed_display_name: publicReviewerName,
          attributed_display_email: null,
          rating: form.rating,
          title: form.title.trim(),
          body: form.content.trim(),
          status: "pending",
          media: [],
        })
        .select("id")
        .single();

      if (insErr) {
        if (
          insErr.code === "23505" ||
          insErr.message.toLowerCase().includes("duplicate") ||
          insErr.message.toLowerCase().includes("unique")
        ) {
          toast.error("You already submitted a review for this product.");
        } else {
          toast.error(insErr.message);
        }
        return;
      }

      const reviewId = inserted.id as string;
      void fetch("/api/revalidate-review-surface", { method: "POST", keepalive: true }).catch(() => {});

      if (validatedFiles.length > 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error("Your session expired. Sign in again to upload photos or videos.");
          closeReviewModal();
          router.refresh();
          return;
        }
      }

      const uploadResult = await uploadReviewMediaForReviewRow(supabase, reviewId, validatedFiles);
      if (!uploadResult.ok) {
        toast.error(
          uploadResult.fileName
            ? `Upload failed (${uploadResult.fileName}): ${uploadResult.message}`
            : uploadResult.message,
        );
        closeReviewModal();
        router.refresh();
        return;
      }
      const media = uploadResult.media;

      if (media.length > 0) {
        const { error: upRevErr } = await supabase
          .from("reviews")
          .update({
            media,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reviewId);
        if (upRevErr) {
          toast.error(upRevErr.message);
          return;
        }
      }

      const reviewerLabel = postingHint.trim() || "You";
      const optimistic: ProductReviewPdpRow = {
        id: reviewId,
        product_id: productId,
        rating: form.rating,
        title: form.title.trim(),
        body: form.content.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
        media,
        reviewer_name: reviewerLabel,
        show_verified_buyer: false,
      };
      setReviews((prev) => [optimistic, ...prev.filter((r) => r.id !== reviewId)]);
      setSubmittedMediaPreview(media);
      void router.refresh();

      shouldRefreshOnCloseRef.current = true;
      setPendingAttachments((prev) => {
        prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setReviewSubmitSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="mt-12 border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.50rem] font-semibold tracking-tight text-neutral-900 sm:text-3xl">Customer Reviews</h2>
          <button
            type="button"
            onClick={() => void onWriteReviewClick()}
            className="cursor-pointer rounded-sm border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Write a review
          </button>
        </div>

        {!hasReviewsAggregate && reviews.length === 0 ? (
          <div className="mt-6 rounded-xl border border-neutral-200/90 bg-linear-to-b from-neutral-50 to-white px-5 py-10 text-center shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:px-8 sm:py-12">
            <div className="mx-auto max-w-md">
              <p className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                No reviews yet
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                Tried this product? A short note on quality, fit, or how it holds up in real use helps the
                next person decide with confidence.
              </p>
            </div>
          </div>
        ) : hasReviewsAggregate ? (
          <div className="mt-4 border-b border-neutral-200 pb-4">
            <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
              <div>
                <Stars value={displayRating} />
                <p className="mt-1 text-sm text-neutral-600">Based on {reviewsCount} reviews</p>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star, i) => (
                  <div key={star} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                    <span className="w-10 text-neutral-600">{star}★</span>
                    <div className="h-2 overflow-hidden rounded bg-neutral-200">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(dist[i] / maxDist) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-neutral-600">{dist[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">
            Product ratings will appear here after the first approved review.
          </p>
        )}

        {sortedApproved.length > 0 ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {pagedReviews.map((r) => {
                const dateLabel = reviewDateLabel(r);
                return (
                  <article key={r.id} className="border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-neutral-900">{r.reviewer_name}</p>
                      {r.status === "pending" ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                          Pending moderation
                        </span>
                      ) : null}
                      {r.status === "rejected" ? (
                        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                          Not published
                        </span>
                      ) : null}
                      {r.show_verified_buyer ? (
                        <span className="inline-flex bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Verified buyer
                        </span>
                      ) : null}
                    </div>
                    {dateLabel ? (
                      <p className="mt-1 text-sm font-medium text-neutral-500">{dateLabel}</p>
                    ) : null}
                    <div className="mt-2">
                      <Stars value={r.rating} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-700">{r.body}</p>
                    {r.media.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.media.map((m, idx) =>
                          m.kind === "image" ? (
                            <div
                              key={`${r.id}-m-${idx}`}
                              className="h-24 w-24 overflow-hidden rounded-md border border-neutral-200 bg-white"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URLs */}
                              <img
                                src={m.url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <video
                              key={`${r.id}-m-${idx}`}
                              src={m.url}
                              className="h-28 max-w-full rounded-md border border-neutral-200"
                              controls
                              playsInline
                            />
                          ),
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {reviewPageCount > 1 ? (
              <nav
                className="mt-6 flex flex-wrap items-center justify-center gap-2"
                aria-label="Review pages"
              >
                <button
                  type="button"
                  disabled={safeReviewPage <= 1}
                  onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer rounded-sm border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 text-sm text-neutral-600">
                  Page {safeReviewPage} of {reviewPageCount}
                </span>
                <button
                  type="button"
                  disabled={safeReviewPage >= reviewPageCount}
                  onClick={() => setReviewPage((p) => Math.min(reviewPageCount, p + 1))}
                  className="cursor-pointer rounded-sm border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>

      <SignInModal
        open={signInModalOpen}
        onClose={closeSignInModal}
        nextPath={nextPathWithReviewFlag}
        title="Sign in to write a review"
        description="Sign in with Google or your email. You’ll stay on this page — we’ll open the review form as soon as you’re signed in."
        closeModalOnPasswordSuccess={false}
      />

      {reviewModalOpen ? (
        <ModalShell
          open={reviewModalOpen}
          onClose={closeReviewModal}
          titleId={
            reviewSubmitSuccess ? `${formId}-thank-title` : `${formId}-review-title`
          }
          title={reviewSubmitSuccess ? "Review submitted" : "Write a review"}
          subtitle={
            reviewSubmitSuccess ? (
              "We’ve received your rating and comments. They’ll go live after a quick review."
            ) : postingHint ? (
              <>
                Posting as{" "}
                <span className="font-medium text-neutral-900">{postingHint}</span>
              </>
            ) : (
              "Rate this product and share what stood out for you."
            )
          }
          maxWidthClassName="max-w-3xl"
          zIndexClassName="z-[210]"
          footer={
            reviewSubmitSuccess ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="w-full cursor-pointer btn rounded-none bg-neutral-950 text-white shadow-sm transition hover:bg-neutral-900 sm:w-auto"
                >
                  Back to product
                </button>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="cursor-pointer btn rounded-none border border-neutral-300 bg-white text-neutral-800 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form={`${formId}-review-form`}
                  disabled={submitting}
                  className="cursor-pointer btn rounded-none bg-neutral-950 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </div>
            )
          }
        >
          {reviewSubmitSuccess ? (
            <div className="rounded-2xl border border-emerald-200/70 bg-linear-to-b from-emerald-50/95 via-white to-neutral-50/40 px-4 py-7 sm:px-7 sm:py-8">
              <div className="mx-auto flex max-w-lg flex-col items-center text-center">
                <div
                  className="mb-6 flex h-17 w-17 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_12px_40px_-12px_rgba(5,150,105,0.55)] ring-1 ring-emerald-700/20"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-9 w-9"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-[15px] font-medium leading-snug text-neutral-900">
                  Thanks — your review helps the community shop smarter.
                </p>
                {submittedMediaPreview.length > 0 ? (
                  <div className="mt-5 flex w-full max-w-md flex-wrap justify-center gap-2">
                    {submittedMediaPreview.map((m, idx) =>
                      m.kind === "image" ? (
                        <div
                          key={`success-m-${idx}`}
                          className="h-20 w-20 overflow-hidden rounded-lg border border-emerald-200/80 bg-white shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <video
                          key={`success-m-${idx}`}
                          src={m.url}
                          className="h-24 max-w-[min(100%,280px)] rounded-lg border border-emerald-200/80"
                          controls
                          playsInline
                        />
                      ),
                    )}
                  </div>
                ) : null}
                <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
                  Here’s what happens next:
                </p>
                <ol className="mt-5 w-full max-w-md space-y-3.5 text-left text-sm leading-relaxed text-neutral-700">
                  <li className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                      aria-hidden
                    >
                      1
                    </span>
                    <span>
                      We run a brief check for spam and policy compliance—usually quite fast.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                      aria-hidden
                    >
                      2
                    </span>
                    <span>
                      Once approved, your rating and text show on this product page for other
                      shoppers.
                    </span>
                  </li>
                </ol>
                <p className="mt-6 max-w-md border-t border-emerald-100/80 pt-5 text-xs leading-relaxed text-neutral-500">
                  You can close this dialog and keep browsing—nothing else is required from you.
                </p>
              </div>
            </div>
          ) : (
            <form
              id={`${formId}-review-form`}
              onSubmit={(e) => void onSubmitReview(e)}
              className="space-y-4"
            >
              <div>
                <p
                  id={`${formId}-rating-label`}
                  className="mb-1 text-xs font-semibold tracking-[0.14em] text-neutral-700"
                >
                  RATING
                </p>
                <RatingPicker
                  labelId={`${formId}-rating-label`}
                  value={form.rating}
                  onChange={(n) => setForm((f) => ({ ...f, rating: n }))}
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-title`}
                  className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700"
                >
                  REVIEW TITLE
                </label>
                <input
                  id={`${formId}-title`}
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Give your review a title"
                  className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-content`}
                  className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700"
                >
                  REVIEW CONTENT
                </label>
                <textarea
                  id={`${formId}-content`}
                  required
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Start writing here..."
                  className="w-full resize-y border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
                  PICTURE/VIDEO (OPTIONAL, max {REVIEW_MAX_FILES} files)
                </label>
                <p className="mb-2 text-xs text-neutral-500">
                  Images up to 2 MB each; videos up to 5 MB each. Tap a thumbnail’s × to remove it before
                  you submit.
                </p>
                <div className="flex flex-wrap gap-3">
                  {pendingAttachments.map((a) => (
                    <div
                      key={a.id}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded border border-neutral-300 bg-neutral-100"
                    >
                      {a.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
                        <img src={a.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <video
                          src={a.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(a.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-none bg-neutral-900/85 text-sm font-bold leading-none text-white shadow-sm hover:bg-neutral-900"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {pendingAttachments.length < REVIEW_MAX_FILES ? (
                    <label
                      htmlFor={`${formId}-media`}
                      className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 text-3xl text-neutral-400 hover:border-neutral-500 hover:bg-neutral-100"
                    >
                      📷
                    </label>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  id={`${formId}-media`}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  onChange={onPendingMediaChange}
                />
                <p className="mt-2 text-xs text-neutral-500">
                  {pendingAttachments.length >= REVIEW_MAX_FILES
                    ? `Maximum ${REVIEW_MAX_FILES} files selected. Remove one to add a different file.`
                    : "Tap the camera to add photos or videos."}
                </p>
              </div>
              <p className="text-xs text-neutral-600">
                We will only contact you about the review you left, and only if necessary.
              </p>
            </form>
          )}
        </ModalShell>
      ) : null}
    </>
  );
}

function CustomerReviewsFallback({ rating, reviewsCount }: Pick<Props, "rating" | "reviewsCount">) {
  const hasReviews = reviewsCount > 0;
  const displayRating = Number.isFinite(rating) ? rating : 0;
  return (
    <section className="mt-12 border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.50rem] font-semibold tracking-tight text-neutral-900 sm:text-3xl">Customer Reviews</h2>
        <div className="h-10 w-36 animate-pulse rounded-sm bg-neutral-100" />
      </div>
      {!hasReviews ? (
        <div className="mt-3 h-5 w-64 animate-pulse rounded bg-neutral-100" />
      ) : (
        <div className="mt-4 h-24 animate-pulse rounded bg-neutral-100" />
      )}
      <p className="sr-only">
        Loading reviews. Rating {displayRating}, count {reviewsCount}.
      </p>
    </section>
  );
}

export function CustomerReviews(props: Props) {
  return (
    <Suspense
      fallback={
        <CustomerReviewsFallback rating={props.rating} reviewsCount={props.reviewsCount} />
      }
    >
      <CustomerReviewsInner {...props} />
    </Suspense>
  );
}
