"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StemContent } from "@/components/shared/StemContent";
import {
  HOMEPAGE_HARDER_QUESTION,
  consumeHomepageExampleRevealPending,
} from "@/lib/homepage/exampleQuestion";

export function ExampleAnswerRevealModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("reveal_example") === "1";
    const fromStorage = consumeHomepageExampleRevealPending();
    if (!fromQuery && !fromStorage) return;

    setOpen(true);

    if (fromQuery) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("reveal_example");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  if (!open) return null;

  const correct = HOMEPAGE_HARDER_QUESTION.options.find(
    (o) => o.label === HOMEPAGE_HARDER_QUESTION.correctLabel,
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close answer reveal"
        className="absolute inset-0 bg-black/60"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="example-answer-title"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-surface-elevated p-6 shadow-modal-card sm:p-8"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Example solution unlocked
        </p>
        <h2
          id="example-answer-title"
          className="mt-2 text-2xl font-bold tracking-tight text-text"
        >
          Answer: {correct?.label} ({HOMEPAGE_HARDER_QUESTION.correctValue})
        </h2>

        <div className="mt-5 text-sm leading-relaxed text-text-muted sm:text-base">
          <StemContent
            content={HOMEPAGE_HARDER_QUESTION.promptMarkdown}
            className="text-inherit"
          />
        </div>

        <div className="mt-5 rounded-xl bg-primary/12 px-4 py-3 text-sm text-text">
          <StemContent
            content={HOMEPAGE_HARDER_QUESTION.explanationMarkdown}
            className="text-inherit"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-organic-md bg-primary px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-primary-hover"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  );
}
