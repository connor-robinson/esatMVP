"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  MARKETING_HOMEPAGE_REVIEW_REPLY,
  splitMarketingReviews,
  type MarketingReview,
} from "@/lib/homepage/marketingReviews";

const LOGIN_HREF = `/login?redirectTo=${encodeURIComponent("/#reviews")}`;

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

function LeaveReviewForm() {
  const session = useSupabaseSession();
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const loggedIn = Boolean(session?.user);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!loggedIn) {
      router.push(LOGIN_HREF);
      return;
    }

    const review = text.trim();
    if (review.length < 8) {
      setError("Write a little more before sending.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/homepage/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || "Could not send review");
      }
      setText("");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send review");
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full rounded-2xl border border-white/10 bg-[#0A0F1D]/60 p-4 sm:p-5"
    >
      <label htmlFor="homepage-review" className="sr-only">
        Leave a review
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <textarea
          id="homepage-review"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status !== "idle") setStatus("idle");
            if (error) setError(null);
          }}
          rows={2}
          maxLength={1200}
          placeholder={
            loggedIn
              ? "Leave a review…"
              : "Leave a review (log in to send)…"
          }
          className="min-h-[3.25rem] w-full flex-1 resize-y rounded-xl border border-white/10 bg-[#161D2F] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-[#64748B] focus:border-[#3B82F6]/50 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/40"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60 sm:self-stretch sm:px-8"
        >
          {status === "sending"
            ? "Sending…"
            : loggedIn
              ? "Send"
              : "Log in to send"}
        </button>
      </div>
      <p className="mt-2 text-xs text-[#64748B]">
        {loggedIn ? (
          status === "sent" ? (
            <span className="text-[#86EFAC]">
              Thanks. We&apos;ll review it and may put it up here.
            </span>
          ) : error ? (
            <span className="text-[#FCA5A5]">{error}</span>
          ) : (
            "We read every review before it goes live."
          )
        ) : (
          <>
            You need to{" "}
            <Link
              href={LOGIN_HREF}
              className="font-semibold text-[#93C5FD] hover:text-white"
            >
              log in
            </Link>{" "}
            to leave a review.
          </>
        )}
      </p>
    </form>
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
          </div>

          {!expanded && rest.length > 0 ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#161D2F]/70 to-[#161D2F] sm:h-44"
            />
          ) : null}
        </div>

        {rest.length > 0 ? (
          <div className="relative z-10 -mt-6 flex justify-center sm:-mt-8">
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
          </div>
        ) : null}

        <aside className="mt-10 w-full rounded-2xl border border-[#3B82F6]/25 bg-[#0A0F1D]/80 px-5 py-6 sm:mt-12 sm:px-8 sm:py-7 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">
            {MARKETING_HOMEPAGE_REVIEW_REPLY.title}
          </p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#CBD5E1] sm:text-base sm:leading-relaxed">
            {MARKETING_HOMEPAGE_REVIEW_REPLY.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </aside>

        <div className="mt-5 sm:mt-6">
          <LeaveReviewForm />
        </div>
      </div>
    </section>
  );
}
