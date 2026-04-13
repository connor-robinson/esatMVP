"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ReviewQuestion, PaperType } from "@/types/review";
import { stripHtml, cn } from "@/lib/utils";
import { resolveReviewQuestionInput } from "@/lib/reviewLookup";
import { ChevronLeft, ChevronRight, ListVideo, Video } from "lucide-react";
import {
  ReviewDashboardFilters,
  type DashboardFilterState,
} from "@/components/ReviewDashboardFilters";
import { ReviewStatsBreakdown } from "@/components/ReviewStatsBreakdown";

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

function parseFilterState(sp: URLSearchParams): DashboardFilterState {
  const pt = sp.get("paperType");
  const paperType: PaperType =
    pt === "TMUA" || pt === "ESAT" ? pt : "All";
  const sort = sp.get("sort") || "updated_desc";
  const subjects =
    sp
      .get("subjects")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const difficulties =
    sp
      .get("difficulties")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const statuses =
    sp
      .get("status")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const hasVideoOnly = sp.get("hasVideo") === "1";
  const schemaReclassOnly = sp.get("schemaReclass") === "1";
  return {
    paperType,
    sort,
    subjects,
    difficulties,
    statuses,
    hasVideoOnly,
    schemaReclassOnly,
  };
}

export function ReviewDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  const filterState = useMemo(
    () => parseFilterState(searchParams),
    [searchParams]
  );

  const page = useMemo(() => {
    const raw = parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(raw) && raw >= 1 ? raw : 1;
  }, [searchParams]);

  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walkCodes, setWalkCodes] = useState<Record<string, string>>({});
  const [lookupError, setLookupError] = useState<string | null>(null);

  const commitParams = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      if (resetPage) p.set("page", "1");
      router.replace(`/?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const onPaperType = useCallback(
    (type: PaperType) => {
      commitParams((p) => {
        if (type === "All") p.delete("paperType");
        else p.set("paperType", type);
        p.delete("subjects");
      });
    },
    [commitParams]
  );

  const onSort = useCallback(
    (sort: string) => {
      commitParams((p) => {
        if (sort === "updated_desc") p.delete("sort");
        else p.set("sort", sort);
      });
    },
    [commitParams]
  );

  const onToggleSubject = useCallback(
    (subject: string) => {
      commitParams((p) => {
        const cur =
          p
            .get("subjects")
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        const next = cur.includes(subject)
          ? cur.filter((s) => s !== subject)
          : [...cur, subject];
        if (next.length === 0) p.delete("subjects");
        else p.set("subjects", next.join(","));
      });
    },
    [commitParams]
  );

  const onToggleDifficulty = useCallback(
    (d: string) => {
      commitParams((p) => {
        const cur =
          p
            .get("difficulties")
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
        if (next.length === 0) p.delete("difficulties");
        else p.set("difficulties", next.join(","));
      });
    },
    [commitParams]
  );

  const onToggleStatus = useCallback(
    (s: string) => {
      commitParams((p) => {
        const cur =
          p
            .get("status")
            ?.split(",")
            .map((x) => x.trim())
            .filter(Boolean) ?? [];
        const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
        if (next.length === 0) p.delete("status");
        else p.set("status", next.join(","));
      });
    },
    [commitParams]
  );

  const onToggleHasVideo = useCallback(() => {
    commitParams((p) => {
      if (p.get("hasVideo") === "1") p.delete("hasVideo");
      else p.set("hasVideo", "1");
    });
  }, [commitParams]);

  const onToggleSchemaReclass = useCallback(() => {
    commitParams((p) => {
      if (p.get("schemaReclass") === "1") p.delete("schemaReclass");
      else p.set("schemaReclass", "1");
    });
  }, [commitParams]);

  const onClear = useCallback(() => {
    router.replace("/", { scroll: false });
  }, [router]);

  const onJumpToQuestion = useCallback(
    async (raw: string) => {
      setLookupError(null);
      const res = await resolveReviewQuestionInput(raw);
      if (res.kind === "error") {
        setLookupError(res.message);
        return;
      }
      router.push(`/review?id=${encodeURIComponent(res.id)}`);
    },
    [router]
  );

  const hrefForPage = useCallback(
    (n: number) => {
      const p = new URLSearchParams(searchParams.toString());
      if (n <= 1) p.delete("page");
      else p.set("page", String(n));
      const qs = p.toString();
      return qs ? `/?${qs}` : "/";
    },
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    if (filterState.sort && filterState.sort !== "updated_desc") {
      params.set("sort", filterState.sort);
    }
    if (filterState.paperType === "TMUA") {
      params.set("paperType", "TMUA");
    } else if (filterState.paperType === "ESAT") {
      params.set("paperType", "ESAT");
    }
    if (filterState.subjects.length > 0) {
      params.set("subjects", filterState.subjects.join(","));
    }
    if (filterState.difficulties.length > 0) {
      params.set("difficulties", filterState.difficulties.join(","));
    }
    if (filterState.statuses.length > 0) {
      params.set("status", filterState.statuses.join(","));
    }
    if (filterState.hasVideoOnly) {
      params.set("hasVideo", "1");
    }
    if (filterState.schemaReclassOnly) {
      params.set("schemaReclassTier", "any");
    }
    params.set("slim", "1");
    params.set("_cb", String(Date.now()));

    fetch(`/api/review/questions?${params.toString()}`, { cache: "no-store" })
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
  }, [queryKey]);

  useEffect(() => {
    if (questions.length === 0) return;
    const missing = questions
      .filter(
        (q) =>
          Object.prototype.hasOwnProperty.call(q, "media_upload_code") &&
          !(q.media_upload_code && String(q.media_upload_code).trim())
      )
      .map((q) => q.id);
    if (missing.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missing.map((id) =>
        fetch("/api/review/ensure-media-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: id }),
        })
          .then((r) => r.json())
          .then((j: { media_upload_code?: string }) => {
            const c = j.media_upload_code?.trim();
            return c ? ([id, c] as const) : null;
          })
      )
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const p of pairs) {
        if (p) next[p[0]] = p[1];
      }
      if (Object.keys(next).length > 0) {
        setWalkCodes((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [questions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const sortLabel =
    filterState.sort === "created_desc"
      ? "Created · newest first"
      : filterState.sort === "created_asc"
        ? "Created · oldest first"
        : "Updated · newest first";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-black/20 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif text-white tracking-tight">Review dashboard</h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            {sortLabel} · {total} matching
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
        <ReviewDashboardFilters
          state={filterState}
          onPaperType={onPaperType}
          onSort={onSort}
          onToggleSubject={onToggleSubject}
          onToggleDifficulty={onToggleDifficulty}
          onToggleStatus={onToggleStatus}
          onToggleHasVideo={onToggleHasVideo}
          onToggleSchemaReclass={onToggleSchemaReclass}
          onClear={onClear}
          lookupError={lookupError}
          onClearLookupError={() => setLookupError(null)}
          onJumpToQuestion={onJumpToQuestion}
        />

        <section className="mb-8" aria-label="Question bank statistics">
          <ReviewStatsBreakdown variant="dashboard" defaultOpen liveRefreshMs={90_000} />
        </section>

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
            <p className="text-white/60 font-mono">No questions match these filters.</p>
            {page > 1 && (
              <Link
                href={hrefForPage(1)}
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
              const walkCode =
                (q.media_upload_code?.trim() &&
                  q.media_upload_code.trim().toUpperCase()) ||
                walkCodes[q.id] ||
                null;

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
                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        {walkCode ? (
                          <span
                            className="text-sm font-black font-mono px-3 py-1 rounded-organic-sm bg-amber-300/20 text-amber-100 border-2 border-amber-400/70 tracking-[0.15em]"
                            title="Walkthrough upload code for iPad"
                          >
                            {walkCode}
                          </span>
                        ) : (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-white/5 text-white/35 border border-white/10">
                            …
                          </span>
                        )}
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-interview/20 text-interview-light border border-interview/30">
                          {exam}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-white/10 text-white/80 border border-white/10">
                          {subject}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-mono px-2 py-0.5 rounded-organic-sm border",
                            q.difficulty === "Easy" &&
                              "bg-[#506141]/20 text-[#85BC82] border-[#506141]/30",
                            q.difficulty === "Medium" &&
                              "bg-[#967139]/20 text-[#b8a066] border-[#967139]/30",
                            q.difficulty === "Hard" &&
                              "bg-[#854952]/20 text-[#ef7d7d] border-[#854952]/30",
                            q.difficulty === "Extreme" &&
                              "bg-purple-600/30 text-purple-200 border-purple-400/35",
                            q.difficulty !== "Easy" &&
                              q.difficulty !== "Medium" &&
                              q.difficulty !== "Hard" &&
                              q.difficulty !== "Extreme" &&
                              "bg-white/5 text-white/60 border-white/10"
                          )}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-white/5 text-white/55 border border-white/10">
                          {q.status}
                        </span>
                        {q.screen_video_storage_path?.trim() ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-emerald-500/25 text-emerald-200 border border-emerald-400/45"
                            title="Walkthrough video uploaded"
                          >
                            <Video className="w-3 h-3 shrink-0" aria-hidden />
                            Video attached
                          </span>
                        ) : null}
                        {q.schema_reclass_review_tier === "urgent" ? (
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-rose-500/25 text-rose-100 border border-rose-400/45"
                            title="Schema prefix reclassified — sibling / priority review"
                          >
                            Reclass · urgent
                          </span>
                        ) : q.schema_reclass_review_tier === "secondary" ? (
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-amber-500/20 text-amber-100/95 border border-amber-400/35"
                            title="Schema prefix reclassified — far / secondary review"
                          >
                            Reclass · secondary
                          </span>
                        ) : q.schema_reclass_review_tier === "review_needed" ? (
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-organic-sm bg-violet-500/20 text-violet-100/95 border border-violet-400/40"
                            title="Stored schema_id is pre-rename; canonical id is schema_reclass_new_id — keep or delete"
                          >
                            Reclass · review
                          </span>
                        ) : null}
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
                href={hasPrev ? hrefForPage(page - 1) : "#"}
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
                href={hasNext ? hrefForPage(page + 1) : "#"}
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
