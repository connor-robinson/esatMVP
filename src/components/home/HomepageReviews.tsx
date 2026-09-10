"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MARKETING_HOMEPAGE_REVIEW_REPLY,
  splitMarketingReviews,
  type MarketingReview,
} from "@/lib/homepage/marketingReviews";

const LEAVE_REVIEW_HREF =
  "mailto:esatcamp@gmail.com?subject=ESAT%20Camp%20review";

function StarRow({ stars }: { stars: MarketingReview["stars"] }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${stars} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "text-[0.8rem] leading-none",
            i < stars ? "text-[#F5C542]" : "text-white/20",
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: MarketingReview }) {
  return (
    <figure className="flex h-full min-h-[9.5rem] flex-col rounded-xl bg-white/[0.035] px-4 py-4 sm:min-h-[10.5rem] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <StarRow stars={review.stars} />
        <figcaption className="max-w-[55%] truncate text-right font-mono text-[0.65rem] tracking-tight text-[#64748B]">
          {review.emailMask}
        </figcaption>
      </div>
      <blockquote className="mt-3 flex-1 text-[0.88rem] leading-relaxed text-[#E2E8F0] sm:text-[0.92rem]">
        “{review.quote}”
      </blockquote>
    </figure>
  );
}

function LeaveReviewCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[9.5rem] flex-col justify-between rounded-xl border border-dashed border-white/15 px-4 py-4 sm:min-h-[10.5rem] sm:px-5 sm:py-5",
        className,
      )}
    >
      <div>
        <p className="font-display text-lg font-bold text-white">
          Leave a review
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Tell us how ESAT Camp is going. We&apos;ll read it, and if it fits
          we&apos;ll put it up here.
        </p>
      </div>
      <Link
        href={LEAVE_REVIEW_HREF}
        className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-white"
      >
        Write a review
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export function HomepageReviews() {
  const { preview, rest } = useMemo(() => splitMarketingReviews(), []);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? [...preview, ...rest] : preview;

  return (
    <section id="reviews" className="scroll-mt-28 bg-[#161D2F] py-20 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What students are saying
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Real feedback from people revising for the ESAT. A few rotate each
            day; expand to read the rest.
          </p>
        </div>

        <div className="relative">
          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4",
              !expanded && rest.length > 0 && "pb-4",
            )}
          >
            {visible.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {expanded ? <LeaveReviewCard /> : null}
          </div>

          {!expanded && rest.length > 0 ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#161D2F]/70 to-[#161D2F] sm:h-44"
            />
          ) : null}
        </div>

        <div className="relative z-10 -mt-6 flex flex-col items-center gap-5 sm:-mt-8">
          {rest.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0F1D]/90 px-5 py-2.5 text-sm font-semibold text-[#93C5FD] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-white/20 hover:text-white"
              aria-expanded={expanded}
            >
              {expanded
                ? "Show fewer reviews"
                : `View ${rest.length} more reviews`}
              <span aria-hidden className="text-base leading-none">
                {expanded ? "↑" : "↓"}
              </span>
            </button>
          ) : null}

          {!expanded ? (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <LeaveReviewCard className="sm:col-span-2 lg:col-span-2 lg:col-start-2" />
            </div>
          ) : null}
        </div>

        <aside className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#3B82F6]/25 bg-[#0A0F1D]/80 px-5 py-6 sm:mt-12 sm:px-7 sm:py-7">
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
