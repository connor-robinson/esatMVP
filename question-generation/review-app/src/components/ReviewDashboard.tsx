"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReviewQuestion } from "@/types/review";
import { stripHtml, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";

const PAGE_SIZE = 20;

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatSecondaryTags(tags: ReviewQuestion["secondary_tags"]): string | null {
  if (tags == null) return null;
  if (Array.isArray(tags)) return tags.length ? tags.join(", ") : null;
  return null;
}

function topicLine(q: ReviewQuestion): string {
  const secondary = formatSecondaryTags(q.secondary_tags);
  const parts = [q.primary_tag, secondary].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

type ReviewDashboardProps = {
  page: number;
};

export function ReviewDashboard({ page }: ReviewDashboardProps) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;

    fetch(`/api/review/questions?limit=${PAGE_SIZE}&offset=${offset}&sort=created_desc`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load questions");
        return r.json();
      })
      .then((data: { questions?: ReviewQuestion[]; total?: number }) => {
        if (cancelled) return;
        setQuestions(data.questions ?? []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-black/20 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif text-white tracking-tight">Review dashboard</h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Pending questions, newest first · {total} total
          </p>
        </div>
        <Link
          href="/review"
          className="inline-flex items-center gap-2 rounded-organic-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-mono text-primary-light hover:bg-primary/20 transition-colors"
        >
          <ListVideo className="w-4 h-4" strokeWidth={2.5} />
          Open review queue
        </Link>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="rounded-organic-lg border border-white/10 bg-white/[0.02] py-20 text-center text-white/50 font-mono">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-organic-lg border border-[#ef7d7d]/30 bg-[#ef7d7d]/10 py-12 text-center text-[#ef7d7d] font-mono">
            {error}
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-organic-lg border border-white/10 bg-white/[0.02] py-20 text-center">
            <p className="text-white/60 font-mono">No pending questions on this page.</p>
            {page > 1 && (
              <Link
                href="/"
                className="inline-block mt-4 text-sm text-primary-light font-mono hover:underline"
              >
                Back to first page
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {questions.map((q) => {
              const preview = stripHtml(q.question_stem || "").slice(0, 140);
              const exam = q.test_type ?? "—";
              const subject = q.subjects ?? "—";

              return (
                <li key={q.id}>
                  <Link href={`/review/${encodeURIComponent(q.id)}`} className="block group">
                    <article
                      className={cn(
                        "rounded-organic-lg border border-white/10 bg-white/[0.03] p-4",
                        "hover:border-primary/35 hover:bg-white/[0.06] transition-colors"
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                        <span className="font-mono text-xs text-white/45 truncate max-w-[min(100%,28rem)]">
                          {q.id}
                        </span>
                        <span className="font-mono text-xs text-white/40 shrink-0">
                          {formatCreatedAt(q.created_at)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-interview/20 text-interview-light border border-interview/30">
                          {exam}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-white/10 text-white/80 border border-white/10">
                          {subject}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-white/5 text-white/60 border border-white/10">
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/55 font-mono line-clamp-2">
                        <span className="text-white/35">Topic · </span>
                        {topicLine(q)}
                      </p>
                      {preview ? (
                        <p className="mt-2 text-sm text-white/40 line-clamp-2 leading-relaxed">
                          {preview}
                          {stripHtml(q.question_stem || "").length > 140 ? "…" : ""}
                        </p>
                      ) : null}
                    </article>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && total > 0 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"
            aria-label="Pagination"
          >
            <span className="text-sm text-white/45 font-mono">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={hasPrev ? `/?page=${page - 1}` : "#"}
                aria-disabled={!hasPrev}
                className={cn(
                  "inline-flex items-center gap-1 rounded-organic-md border px-3 py-2 text-sm font-mono transition-colors",
                  hasPrev
                    ? "border-white/15 bg-white/[0.05] text-white/85 hover:bg-white/[0.1]"
                    : "border-white/5 text-white/25 pointer-events-none"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Link>
              <Link
                href={hasNext ? `/?page=${page + 1}` : "#"}
                aria-disabled={!hasNext}
                className={cn(
                  "inline-flex items-center gap-1 rounded-organic-md border px-3 py-2 text-sm font-mono transition-colors",
                  hasNext
                    ? "border-white/15 bg-white/[0.05] text-white/85 hover:bg-white/[0.1]"
                    : "border-white/5 text-white/25 pointer-events-none"
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
