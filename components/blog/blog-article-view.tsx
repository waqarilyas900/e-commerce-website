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
    <figure className="overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-50">
      {/* Product CDN URLs vary; native-friendly next/image with fill. */}
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover object-top"
          unoptimized={src.includes("slatic.net") || src.includes("alicdn.com")}
        />
      </div>
      <figcaption className="border-t border-neutral-200/80 px-3 py-2 text-xs text-neutral-500">
        {alt}
      </figcaption>
    </figure>
  );
}

function SectionBlock({ section }: { section: BlogSection }) {
  if (section.type === "heading") {
    return (
      <h2 className="pt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-[1.35rem]">
        {section.text}
      </h2>
    );
  }
  if (section.type === "paragraph") {
    return <p className="leading-relaxed text-neutral-700">{section.text}</p>;
  }
  if (section.type === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-neutral-700">
        {section.items.map((item) => (
          <li key={item.slice(0, 48)}>{item}</li>
        ))}
      </ul>
    );
  }
  if (section.type === "image") {
    return <BlogImageBlock src={section.image.src} alt={section.image.alt} />;
  }
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-900 px-5 py-5 text-white sm:px-6">
      <p className="text-[15px] leading-relaxed text-white/90">{section.text}</p>
      <Link
        href={section.href}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
      >
        {section.label}
      </Link>
    </div>
  );
}

export function BlogArticleView({ article }: { article: BlogArticle }) {
  return (
    <article className="space-y-6 py-8 text-base leading-relaxed sm:text-[1.05rem]">
      <BlogImageBlock src={article.hero.src} alt={article.hero.alt} priority />
      {article.sections.map((section, i) => (
        <SectionBlock key={`${section.type}-${i}`} section={section} />
      ))}
    </article>
  );
}
