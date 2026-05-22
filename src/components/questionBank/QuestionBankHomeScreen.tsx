"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, Shuffle, Library } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { QUESTION_BANK_HOME_LAUNCH_KEY } from "@/lib/questionBank/homeLaunch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import {
  ALL_SUBJECT_KEYS,
  SUBJECT_TILES,
  type SubjectKey,
  type SubjectTileConfig,
} from "@/lib/questionBank/subjectTiles";
import { QuestionBankSessionSettingsModal } from "@/components/questionBank/QuestionBankSessionSettingsModal";
import {
  QuestionBankSubjectCard,
  QuestionBankSubjectCardSkeleton,
  QuestionBankComingSoonCard,
} from "@/components/questionBank/QuestionBankSubjectCard";
import { cn } from "@/lib/utils";

export type { SubjectTileConfig } from "@/lib/questionBank/subjectTiles";

type ExamFilter = "all" | "ESAT" | "TMUA";

function progressUrlSubjects(subjects: readonly string[]): string {
  const q = encodeURIComponent(subjects.join(","));
  return `/api/question-bank/progress?subjects=${q}`;
}

function SubjectSection({
  title,
  description,
  tiles,
  tileStats,
  showComingSoon,
  onStart,
  isLoading,
}: {
  title: string;
  description: string;
  tiles: SubjectTileConfig[];
  tileStats: Record<SubjectKey, { attempted: number; total: number; loading: boolean }>;
  showComingSoon?: boolean;
  onStart: (tile: SubjectTileConfig) => void;
  isLoading: boolean;
}) {
  if (tiles.length === 0 && !showComingSoon) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? tiles.map((tile) => (
              <QuestionBankSubjectCardSkeleton key={tile.key} />
            ))
          : tiles.map((tile) => (
              <QuestionBankSubjectCard
                key={tile.key}
                tile={tile}
                stats={tileStats[tile.key]}
                onStart={() => onStart(tile)}
              />
            ))}
        {showComingSoon && !isLoading && <QuestionBankComingSoonCard />}
      </div>
    </div>
  );
}

export function QuestionBankHomeScreen() {
  const router = useRouter();
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [modalTile, setModalTile] = useState<SubjectTileConfig | null>(null);
  const [mixedModalOpen, setMixedModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [examFilter, setExamFilter] = useState<ExamFilter>("all");
  const [aggregate, setAggregate] = useState<{ attempted: number; total: number } | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [tiles, setTiles] = useState<
    Record<SubjectKey, { attempted: number; total: number; loading: boolean }>
  >(() =>
    ALL_SUBJECT_KEYS.reduce(
      (acc, k) => {
        acc[k] = { attempted: 0, total: 0, loading: true };
        return acc;
      },
      {} as Record<SubjectKey, { attempted: number; total: number; loading: boolean }>,
    ),
  );

  const loadStats = useCallback(async () => {
    setIsLoadingProgress(true);
    const aggRes = fetch(`${progressUrlSubjects(ALL_SUBJECT_KEYS)}`, {
      credentials: "include",
    }).then((r) => (r.ok ? r.json() : { attempted: 0, total: 0 }));

    const tileFetches = SUBJECT_TILES.map(async (tile) => {
      const prog = await fetch(
        `${progressUrlSubjects([tile.key])}&testType=${tile.testType}`,
        { credentials: "include" },
      ).then((r) => (r.ok ? r.json() : { attempted: 0, total: 0 }));

      return {
        key: tile.key,
        attempted: prog.attempted ?? 0,
        total: typeof prog.total === "number" ? prog.total : 0,
      };
    });

    try {
      const [aggJson, resolvedTiles] = await Promise.all([
        aggRes,
        Promise.all(tileFetches),
      ]);
      setAggregate({
        attempted: aggJson.attempted ?? 0,
        total: aggJson.total ?? 0,
      });
      setTiles((prev) => {
        const next = { ...prev };
        resolvedTiles.forEach(({ key, attempted, total }) => {
          next[key] = { attempted, total, loading: false };
        });
        return next;
      });
    } catch {
      setAggregate({ attempted: 0, total: 0 });
      setTiles((prev) => {
        const next = { ...prev };
        ALL_SUBJECT_KEYS.forEach((k) => {
          next[k] = { ...next[k], loading: false };
        });
        return next;
      });
    } finally {
      setIsLoadingProgress(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const filteredTiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUBJECT_TILES.filter((t) => {
      const matchesQuery =
        !q ||
        t.headline.toLowerCase().includes(q) ||
        t.topicCaps.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q);
      const matchesExam = examFilter === "all" || t.testType === examFilter;
      return matchesQuery && matchesExam;
    });
  }, [query, examFilter]);

  const esatTiles = useMemo(
    () => filteredTiles.filter((t) => t.testType === "ESAT"),
    [filteredTiles],
  );
  const tmuaTiles = useMemo(
    () => filteredTiles.filter((t) => t.testType === "TMUA"),
    [filteredTiles],
  );

  const aggregatePct =
    aggregate && aggregate.total > 0
      ? Math.min(100, Math.round((aggregate.attempted / aggregate.total) * 100))
      : 0;
  const aggregateTotal = aggregate?.total ?? 0;
  const anyTileLoading = Object.values(tiles).some((t) => t.loading);

  const siblingTilesForModal = useMemo(
    () =>
      modalTile
        ? SUBJECT_TILES.filter((t) => t.testType === modalTile.testType)
        : [],
    [modalTile],
  );

  const openSessionModal = (tile: SubjectTileConfig) => {
    setModalTile(tile);
    setSessionModalOpen(true);
  };

  const handleSessionConfirm = (payload: QuestionBankHomeLaunchPayload) => {
    try {
      sessionStorage.setItem(
        QUESTION_BANK_HOME_LAUNCH_KEY,
        JSON.stringify(payload),
      );
    } catch {
      /* quota / private mode */
    }
    router.push("/questions/questionbank");
  };

  const handleMixedConfirm = (payload: QuestionBankHomeLaunchPayload) => {
    try {
      sessionStorage.setItem(QUESTION_BANK_HOME_LAUNCH_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
    router.push("/questions/questionbank");
  };

  const examFilters: { id: ExamFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "ESAT", label: "ESAT" },
    { id: "TMUA", label: "TMUA" },
  ];

  const showEsatComingSoon =
    (examFilter === "all" || examFilter === "ESAT") &&
    !query.trim() &&
    esatTiles.length === 5;
  const showNoResults = filteredTiles.length === 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-10">
        {/* Hero */}
        <header className="space-y-2">
          <h1 className="text-lg font-semibold text-text sm:text-xl">Question Bank</h1>
          <p className="max-w-2xl text-sm text-text-muted">
            Practice ESAT and TMUA by subject, or mix topics in one session.
          </p>
        </header>

        {/* Toolbar: search, exam filter, actions */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Look for your subject"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(
                  "h-11 w-full rounded-organic-lg bg-surface-elevated py-2 pl-10 pr-4",
                  "text-sm text-text placeholder:text-text-muted",
                  "outline-none ring-0 focus:outline-none focus:ring-1 focus:ring-secondary/25",
                )}
                aria-label="Search subjects"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {examFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setExamFilter(f.id)}
                  className={cn(
                    "rounded-organic-md px-4 py-2 text-sm font-medium transition-colors",
                    examFilter === f.id
                      ? "bg-surface-mid text-text"
                      : "bg-surface-elevated text-text-muted hover:bg-surface-mid/70 hover:text-text",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMixedModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-organic-md px-5 py-2.5 text-sm font-semibold",
                "bg-secondary text-background shadow-glow transition-all duration-fast",
                "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
              )}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
              Mixed practice
            </button>
            <Link
              href="/questions/library"
              className={cn(
                "inline-flex items-center gap-2 rounded-organic-md px-5 py-2.5 text-sm font-medium",
                "bg-surface-elevated text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
              )}
            >
              <Library className="h-4 w-4" aria-hidden />
              Open library
            </Link>
          </div>
        </section>

        {/* Subject grids */}
        <section className="space-y-10">
          {showNoResults ? (
            <p className="rounded-organic-lg bg-surface-elevated px-6 py-10 text-center text-sm text-text-muted">
              No subjects match your search. Try a different term or clear the exam filter.
            </p>
          ) : (
            <>
              {(examFilter === "all" || examFilter === "ESAT") && (
                <SubjectSection
                  title="ESAT"
                  description="Engineering and Science Admissions Test subjects"
                  tiles={esatTiles}
                  tileStats={tiles}
                  showComingSoon={showEsatComingSoon && examFilter === "all"}
                  onStart={openSessionModal}
                  isLoading={anyTileLoading && esatTiles.length > 0}
                />
              )}
              {(examFilter === "all" || examFilter === "TMUA") && (
                <SubjectSection
                  title="TMUA"
                  description="Test of Mathematics for University Admission papers"
                  tiles={tmuaTiles}
                  tileStats={tiles}
                  onStart={openSessionModal}
                  isLoading={anyTileLoading && tmuaTiles.length > 0}
                />
              )}
            </>
          )}
        </section>

        {/* Compact progress */}
        <section className="rounded-organic-xl bg-surface px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">Your progress</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Questions attempted across all subjects
              </p>
            </div>
            {isLoadingProgress ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : aggregate && aggregate.total > 0 ? (
              <p className="text-sm font-medium tabular-nums text-secondary">
                {aggregate.attempted} / {aggregate.total}
                <span className="ml-2 text-text-muted">({aggregatePct}%)</span>
              </p>
            ) : (
              <p className="text-sm text-text-muted">No attempts yet</p>
            )}
          </div>
          {!isLoadingProgress && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-out"
                style={{
                  width: `${aggregateTotal > 0 ? aggregatePct : 0}%`,
                }}
              />
            </div>
          )}
        </section>
      </Container>

      <QuestionBankSessionSettingsModal
        open={sessionModalOpen}
        originTile={modalTile}
        siblingTiles={siblingTilesForModal}
        onClose={() => {
          setSessionModalOpen(false);
          setModalTile(null);
        }}
        onConfirm={handleSessionConfirm}
      />

      <QuestionBankSessionSettingsModal
        open={mixedModalOpen}
        originTile={SUBJECT_TILES[0]}
        siblingTiles={SUBJECT_TILES}
        onClose={() => setMixedModalOpen(false)}
        onConfirm={handleMixedConfirm}
        isMixed
      />
    </div>
  );
}
