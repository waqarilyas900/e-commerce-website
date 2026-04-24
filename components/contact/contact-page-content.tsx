"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact/ContactForm";

export function ContactPageContent() {
  const [sent, setSent] = useState(false);

  return (
    <>
      {!sent ? (
        <header className="mb-1">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Need Help?</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
            Tell us what you need—we typically reply within one business day. You can attach screenshots if
            that helps explain the issue.
          </p>
        </header>
      ) : null}

      <ContactForm onSentChange={setSent} />
    </>
  );
}
