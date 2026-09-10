"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FOUNDERS } from "@/config/founders";
import {
  MARKETING_HOMEPAGE_REVIEW_REPLY,
  splitMarketingReviews,
  type MarketingReview,
} from "@/lib/homepage/marketingReviews";

const LOGIN_HREF = `/login?redirectTo=${encodeURIComponent("/#reviews")}`;
const EWAN = FOUNDERS.ewan;

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
    <figure className="flex h-full min-h-[9.5rem] flex-col rounded-xl bg-white/[0.04] px-4 py-4 sm:min-h-[10.5rem] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <StarRow stars={review.stars} />
        <figcaption className="max-w-[55%] truncate text-right font-mono text-xs tracking-tight text-[#94A3B8] sm:text-[0.8rem]">
          {review.emailMask}
        </figcaption>
      </div>
      <blockquote className="mt-3 flex-1 text-[0.88rem] leading-relaxed text-[#E2E8F0] sm:text-[0.92rem]">
        {review.quote}
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
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 w-full sm:mt-6">
      <label htmlFor="homepage-review" className="sr-only">
        Leave a review
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <textarea
          id="homepage-review"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status !== "idle") setStatus("idle");
            if (error) setError(null);
          }}
          rows={1}
          maxLength={1200}
          placeholder={
            loggedIn
              ? "Leave a review…"
              : "Leave a review (log in to send)…"
          }
          className="min-h-[2.5rem] w-full flex-1 resize-y rounded-lg bg-white/[0.06] px-3 py-2 text-sm leading-snug text-white placeholder:text-[#64748B] focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white/10 px-3.5 text-xs font-semibold text-[#E2E8F0] transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
        >
          {status === "sending"
            ? "Sending…"
            : loggedIn
              ? "Send"
              : "Log in to send"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[#64748B]">
        {status === "sent" ? (
          <span className="text-[#86EFAC]">
            Thanks. We&apos;ll read it, and we&apos;ll put it up here.
          </span>
        ) : error ? (
          <span className="text-[#FCA5A5]">{error}</span>
        ) : loggedIn ? (
          "If you've been using ESAT Camp, tell us how it's going."
        ) : (
          <>
            If you&apos;ve been using ESAT Camp, tell us how it&apos;s going.{" "}
            <Link
              href={LOGIN_HREF}
              className="font-semibold text-[#94A3B8] hover:text-white"
            >
              Log in
            </Link>{" "}
            to send.
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
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0F1D]/90 px-5 py-2.5 text-sm font-semibold text-[#93C5FD] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:text-white"
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

        <aside className="mt-10 flex w-full gap-4 sm:mt-12 sm:gap-5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/[0.06] sm:h-14 sm:w-14">
            <Image
              src={EWAN.imageSrc}
              alt={EWAN.imageAlt}
              fill
              sizes="56px"
              className="object-cover"
              style={{ objectPosition: EWAN.imagePosition }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{EWAN.name}</p>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-[#94A3B8] sm:text-[0.95rem] sm:leading-relaxed">
              {MARKETING_HOMEPAGE_REVIEW_REPLY.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </aside>

        <LeaveReviewForm />
      </div>
    </section>
  );
}
