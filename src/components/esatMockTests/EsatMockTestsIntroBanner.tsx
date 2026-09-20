"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const PAPER_PREVIEW = {
  src: "/images/home/esat-camp-mock-c-physics-page11.webp",
  alt: "Preview of ESAT CAMP Physics Mock C question paper",
  width: 1200,
  height: 1698,
} as const;

const PAGE_TITLE = "ESAT CAMP Free Mock Tests";

const INTRO_COPY =
  "Full ESAT practice papers, created by our experts in conjunction with feedback from students who sat the ESAT 2025. Practice online in real exam conditions, or save your progress and return later. Or download the Question Paper and Mark Scheme.";

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Above-the-fold hero: title, intro note, and expandable paper PDF preview.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <div
        className={cn(
          "grid items-center gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(9rem,12rem)] lg:gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(10rem,13rem)] xl:gap-8",
          className,
        )}
      >
        <div className="flex min-w-0 flex-col gap-3.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {PAGE_TITLE}
          </h1>

          <aside className="bg-white/[0.04] px-3.5 py-3.5 sm:px-4">
            <p className="text-lg leading-relaxed text-[#CBD5E1] sm:text-xl sm:leading-relaxed">
              {INTRO_COPY}
            </p>
          </aside>
        </div>

        <aside
          aria-label="ESAT CAMP Physics Mock C paper preview"
          className="relative mx-auto w-full max-w-[11.5rem] lg:mx-0 lg:max-w-none"
        >
          <div className="relative aspect-[210/297] w-full overflow-hidden rounded-md bg-[#F8FAFC]">
            {/* Plain img: already-optimized webp; avoids unused next/image preloads after Start → solve. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PAPER_PREVIEW.src}
              alt={PAPER_PREVIEW.alt}
              width={PAPER_PREVIEW.width}
              height={PAPER_PREVIEW.height}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-contain object-top"
            />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[#0A0F1D]/85 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A0F1D]"
            >
              Preview
            </button>
          </div>
        </aside>
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Close preview"
            onClick={() => setExpanded(false)}
          />
          <div className="relative z-[121] flex max-h-[min(96vh,1200px)] w-full max-w-[min(92vw,52rem)] flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p
                id={titleId}
                className="text-sm font-medium text-[#E2E8F0] sm:text-base"
              >
                Paper preview
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/15"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-md bg-[#F8FAFC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PAPER_PREVIEW.src}
                alt={PAPER_PREVIEW.alt}
                width={PAPER_PREVIEW.width}
                height={PAPER_PREVIEW.height}
                className="mx-auto h-auto w-full max-w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
