"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

const mdComponents: Components = {
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-neutral-900 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-900"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-neutral-300 pl-3 text-neutral-700">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-neutral-200" />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className={`block font-mono text-[12px] leading-relaxed text-neutral-100 ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-neutral-200/90 px-1 py-0.5 font-mono text-[12px] text-neutral-900"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-full border-collapse text-left text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-100">{children}</thead>,
  th: ({ children }) => <th className="border-b border-neutral-200 px-2 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-neutral-100 px-2 py-1.5">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
};

/** Renders assistant replies as Markdown (GFM) with sanitization — ChatGPT-style rich text, safe HTML. */
export function AssistantMarkdown({ content }: { content: string }) {
  if (!content.trim()) {
    return null;
  }
  return (
    <div className="ask-md text-[13px] text-neutral-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={mdComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
