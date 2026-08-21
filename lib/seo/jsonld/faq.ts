/**
 * FAQPage JSON-LD — only emit when the same Q&A is visible on the page.
 */
export type FaqItem = {
  question: string;
  answer: string;
};

export function faqPageJsonLd(args: {
  url: string;
  items: FaqItem[];
}): Record<string, unknown> | null {
  const items = (args.items ?? []).filter(
    (i) => i.question.trim() && i.answer.trim(),
  );
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${args.url}#faq`,
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: i.answer.trim(),
      },
    })),
  };
}

export type StoreFaqExtras = {
  /** Product display name for product-specific Q&A. */
  productName?: string;
  /** Material from shopping attributes (e.g. Stainless Steel). */
  material?: string | null;
};

/** Shared storefront FAQs (COD / delivery / returns) — product extras optional. */
export function storeFaqItems(
  productNameOrExtras?: string | StoreFaqExtras,
): FaqItem[] {
  const extras: StoreFaqExtras =
    typeof productNameOrExtras === "string"
      ? { productName: productNameOrExtras }
      : productNameOrExtras ?? {};
  const name = (extras.productName ?? "").trim();
  const material = (extras.material ?? "").trim();

  const items: FaqItem[] = [
    {
      question: "Do you offer cash on delivery (COD) in Pakistan?",
      answer:
        "Yes. SimpleCart Store offers cash on delivery across Pakistan. You pay when your order arrives — shipping fees (if any) are shown at checkout before you place the order.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Orders are typically packed within 1–2 business days. Delivery usually takes 2–5 business days in major cities and 4–8 business days in other areas, depending on courier capacity.",
    },
    {
      question: "What is your return policy?",
      answer:
        "If something is wrong with your order, contact us within 7 days of delivery via the Contact page. Damaged or incorrect items are reviewed for return or replacement under our Return Policy.",
    },
  ];

  if (name && material) {
    items.push({
      question: `What is the ${name} made of?`,
      answer: `The ${name} is listed as ${material}. Check the product details on this page for the full specification before you order from SimpleCart Store.`,
    });
  } else if (name) {
    items.push({
      question: `Is the ${name} available for nationwide delivery?`,
      answer: `Yes. You can order ${name} online from SimpleCart Store with delivery available across Pakistan, including cash on delivery at checkout.`,
    });
  } else {
    items.push({
      question: "How can I contact SimpleCart Store?",
      answer:
        "Reach us by email at support@simplecartstore.com or WhatsApp/call at +923009761427 (Mon–Sat, 10:00 AM – 8:00 PM). You can also use the Contact page on our website.",
    });
  }

  return items;
}
