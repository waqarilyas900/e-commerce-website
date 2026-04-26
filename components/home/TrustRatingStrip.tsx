"use client";

export function TrustRatingStrip() {
  return (
    <section className="border-t border-neutral-200 bg-white py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-center shell-x">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-neutral-800">
          <span className="inline-flex items-center text-emerald-600" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 13.4l-3.2-3.2 1.4-1.4 1.8 1.8 4.2-4.2 1.4 1.4-5.6 5.6z" />
            </svg>
          </span>
          <span className="text-xl font-semibold leading-none tracking-tight text-emerald-600">4.8</span>
          <span className="text-sm tracking-[0.12em] text-emerald-600" aria-label="5 out of 5 stars">
            ★★★★★
          </span>
          <span className="text-xs text-neutral-300" aria-hidden>
            |
          </span>
          <span className="text-xs leading-none text-neutral-600">
            4.8 out of 5 stars based on 13447 reviews
          </span>
        </div>
      </div>
    </section>
  );
}
