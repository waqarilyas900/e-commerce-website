import Image from "next/image";
import Link from "next/link";
import type { BlogArticle, BlogSection } from "@/app/lib/blog/product-blog";

function BlogImageBlock({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  if (!src) return null;
  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50 shadow-xs">
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover object-top"
          unoptimized={src.includes("slatic.net") || src.includes("alicdn.com")}
        />
      </div>
      {alt ? (
        <figcaption className="border-t border-neutral-200/70 bg-neutral-50/90 px-4 py-2.5 text-xs text-neutral-600">
          <span className="font-semibold text-neutral-700">Figure:</span> {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SectionBlock({ section }: { section: BlogSection }) {
  if (section.type === "heading") {
    return (
      <h2 className="mt-8 pt-2 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl md:text-[1.65rem]">
        {section.text}
      </h2>
    );
  }
  if (section.type === "subheading") {
    return (
      <h3 className="mt-6 text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
        {section.text}
      </h3>
    );
  }
  if (section.type === "paragraph") {
    return (
      <p className="leading-relaxed text-neutral-700 sm:text-[1.05rem]">
        {section.text}
      </p>
    );
  }
  if (section.type === "list") {
    return (
      <ul className="my-4 list-disc space-y-2.5 pl-5 text-neutral-700 sm:text-[1.02rem]">
        {section.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if (section.type === "numbered-list") {
    return (
      <ol className="my-4 list-decimal space-y-2.5 pl-5 text-neutral-700 sm:text-[1.02rem]">
        {section.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    );
  }
  if (section.type === "callout") {
    const toneStyles = {
      tip: "border-amber-400/80 bg-amber-50/70 text-amber-950",
      info: "border-blue-400/80 bg-blue-50/70 text-blue-950",
      warning: "border-rose-400/80 bg-rose-50/70 text-rose-950",
    };
    const toneIcons = {
      tip: "💡 Expert Pro-Tip",
      info: "ℹ️ Key Takeaway",
      warning: "⚠️ Important Buyer Note",
    };
    const selectedTone = section.tone || "tip";
    return (
      <div
        className={`my-6 rounded-2xl border-l-4 p-5 sm:p-6 ${toneStyles[selectedTone]}`}
      >
        <div className="font-bold text-sm uppercase tracking-wider">
          {section.title || toneIcons[selectedTone]}
        </div>
        <p className="mt-2 text-sm leading-relaxed sm:text-[0.98rem]">
          {section.text}
        </p>
      </div>
    );
  }
  if (section.type === "table") {
    return (
      <div className="my-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-100/80 text-neutral-900 font-semibold">
            <tr>
              {section.headers.map((h, i) => (
                <th key={i} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {section.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? "bg-white" : "bg-neutral-50/60"}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 leading-relaxed">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (section.type === "image") {
    return <BlogImageBlock src={section.image.src} alt={section.image.alt} />;
  }
  if (section.type === "cta") {
    return (
      <div className="my-8 rounded-2xl border border-neutral-900 bg-neutral-950 p-6 text-white shadow-md sm:p-8">
        <p className="text-base font-medium leading-relaxed text-neutral-100 sm:text-lg">
          {section.text}
        </p>
        <div className="mt-5">
          <Link
            href={section.href}
            className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-neutral-950 transition hover:bg-amber-300 shadow-sm"
          >
            {section.label} <span className="ml-2 font-bold" aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }
  return null;
}

export function BlogArticleView({ article }: { article: BlogArticle }) {
  const headings = article.sections
    .filter((s) => s.type === "heading")
    .map((s) => (s as { type: "heading"; text: string }).text);

  return (
    <div className="py-6 sm:py-8">
      {/* Quick Stats / Meta Pills */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral-600">
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-800">
          ⏱️ {article.readTimeMinutes || 5} min read
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">
          ✍️ Verified Buying Guide
        </span>
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-700">
          📦 Fast COD in Pakistan
        </span>
      </div>

      <BlogImageBlock src={article.hero.src} alt={article.hero.alt} priority />

      {/* Table of Contents for rapid skimming (Google loves jump links) */}
      {headings.length >= 3 ? (
        <nav
          className="my-8 rounded-2xl border border-neutral-200/90 bg-neutral-50/70 p-5 sm:p-6"
          aria-label="Table of contents"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            📑 In This Guide
          </div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm font-medium text-neutral-800">
            {headings.map((h, i) => (
              <li key={i} className="hover:text-amber-600">
                <span>{h}</span>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {/* Main Content Stream */}
      <article className="space-y-5 text-base leading-relaxed sm:text-[1.05rem]">
        {article.sections.map((section, i) => (
          <SectionBlock key={`${section.type}-${i}`} section={section} />
        ))}
      </article>

      {/* E-E-A-T Author & Reviewer Box */}
      <div className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-amber-400">
            SC
          </div>
          <div className="flex-1 text-sm text-neutral-600">
            <h4 className="font-bold text-neutral-900">
              Published by SimpleCart Editorial & Sourcing Desk
            </h4>
            <p className="mt-0.5 leading-relaxed">
              Researched and verified by our Pakistani eCommerce product specialists.
              We physically inspect catalog batches, test build quality, and evaluate pricing value
              to deliver genuine advice for household shoppers across Pakistan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
