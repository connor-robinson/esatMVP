"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MARKETING_HOMEPAGE_REVIEW_REPLY,
  splitMarketingReviews,
  type MarketingReview,
} from "@/lib/homepage/marketingReviews";

function StarRow({ stars }: { stars: MarketingReview["stars"] }) {
  return (
    <div
      className="flex items-center gap-0.5 text-[#F5C542]"
      aria-label={`${stars} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < stars;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "text-[0.95rem] leading-none",
              filled ? "text-[#F5C542]" : "text-white/20",
            )}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function ReviewRow({ review }: { review: MarketingReview }) {
  return (
    <figure className="border-t border-white/[0.08] py-6 first:border-t-0 first:pt-0 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <StarRow stars={review.stars} />
        <figcaption className="font-mono text-[0.7rem] tracking-tight text-[#64748B] sm:text-xs">
          {review.emailMask}
        </figcaption>
      </div>
      <blockquote className="mt-3 text-[0.98rem] leading-relaxed text-[#E2E8F0] sm:text-base">
        “{review.quote}”
      </blockquote>
    </figure>
  );
}

export function HomepageReviews() {
  const { preview, rest } = useMemo(() => splitMarketingReviews(), []);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? [...preview, ...rest] : preview;

  return (
    <section id="reviews" className="scroll-mt-28 bg-[#161D2F] py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-5 lg:px-6">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What students are saying
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Real feedback from people revising for the ESAT. A few rotate each
            day; expand to read the rest.
          </p>
        </div>

        <div>
          {visible.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </div>

        {rest.length > 0 ? (
          <div className="mt-2 flex justify-center border-t border-white/[0.08] pt-6">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-white"
              aria-expanded={expanded}
            >
              {expanded
                ? "Show fewer reviews"
                : `View ${rest.length} more reviews`}
              <span aria-hidden className="text-base leading-none">
                {expanded ? "↑" : "↓"}
              </span>
            </button>
          </div>
        ) : null}

        <aside className="mt-10 rounded-2xl border border-[#3B82F6]/25 bg-[#0A0F1D]/80 px-5 py-6 sm:mt-12 sm:px-7 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">
            {MARKETING_HOMEPAGE_REVIEW_REPLY.title}
          </p>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#CBD5E1] sm:text-[0.95rem]">
            {MARKETING_HOMEPAGE_REVIEW_REPLY.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
