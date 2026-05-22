"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { QUESTION_BANK_HOME_LAUNCH_KEY } from "@/lib/questionBank/homeLaunch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import { QuestionBankSessionSettingsModal } from "@/components/questionBank/QuestionBankSessionSettingsModal";
import { cn } from "@/lib/utils";
import { SUBJECT_TILE_STYLES } from "@/lib/questionBank/subjectTileTheme";

const ALL_SUBJECT_KEYS = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
  "Paper 1",
  "Paper 2",
] as const;

type SubjectKey = (typeof ALL_SUBJECT_KEYS)[number];

export interface SubjectTileConfig {
  key: SubjectKey;
  headline: string;
  topicCaps: string;
  testType: "ESAT" | "TMUA";
  titleClass: string;
  topicClass: string;
  statClass: string;
  progressTrackClass: string;
  progressFillClass: string;
  startBtnClass: string;
}

const SUBJECT_TILES: SubjectTileConfig[] = [
  {
    key: "Math 1",
    headline: "ESAT · Math 1",
    topicCaps: "Algebra & functions",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES["Math 1"],
  },
  {
    key: "Math 2",
    headline: "ESAT · Math 2",
    topicCaps: "Sequences & calculus",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES["Math 2"],
  },
  {
    key: "Physics",
    headline: "ESAT · Physics",
    topicCaps: "Mechanics & waves",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Physics,
  },
  {
    key: "Chemistry",
    headline: "ESAT · Chemistry",
    topicCaps: "Structure & reactivity",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Chemistry,
  },
  {
    key: "Biology",
    headline: "ESAT · Biology",
    topicCaps: "Cell & molecular biology",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Biology,
  },
  {
    key: "Paper 1",
    headline: "TMUA · Paper 1",
    topicCaps: "Mathematical thinking",
    testType: "TMUA",
    ...SUBJECT_TILE_STYLES["Paper 1"],
  },
  {
    key: "Paper 2",
    headline: "TMUA · Paper 2",
    topicCaps: "Mathematical reasoning",
    testType: "TMUA",
    ...SUBJECT_TILE_STYLES["Paper 2"],
  },
];

function progressUrlSubjects(
  subjects: readonly string[],
  opts?: { perSubject?: boolean },
): string {
  const q = encodeURIComponent(subjects.join(","));
  const per = opts?.perSubject ? "&perSubject=1" : "";
  return `/api/question-bank/progress?subjects=${q}${per}`;
}

type ProgressApiResponse = {
  attempted?: number;
  total?: number;
  bySubject?: Record<string, { attempted: number; total: number }>;
};

export function QuestionBankHomeScreen() {
  const router = useRouter();
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [modalTile, setModalTile] = useState<SubjectTileConfig | null>(null);
  const [mixedModalOpen, setMixedModalOpen] = useState(false);
  const [query, setQuery] = useState("");
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
    try {
      const res = await fetch(
        progressUrlSubjects(ALL_SUBJECT_KEYS, { perSubject: true }),
        { credentials: "include" },
      );
      const json: ProgressApiResponse = res.ok
        ? await res.json()
        : { attempted: 0, total: 0, bySubject: {} };

      setAggregate({
        attempted: json.attempted ?? 0,
        total: json.total ?? 0,
      });
      setTiles((prev) => {
        const next = { ...prev };
        ALL_SUBJECT_KEYS.forEach((k) => {
          const row = json.bySubject?.[k];
          next[k] = {
            attempted: row?.attempted ?? 0,
            total: row?.total ?? 0,
            loading: false,
          };
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
    if (!q) return SUBJECT_TILES;
    return SUBJECT_TILES.filter(
      (t) =>
        t.headline.toLowerCase().includes(q) ||
        t.topicCaps.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q),
    );
  }, [query]);

  const aggregatePct =
    aggregate && aggregate.total > 0
      ? Math.min(100, Math.round((aggregate.attempted / aggregate.total) * 100))
      : 0;
  const aggregateTotal = aggregate?.total ?? 0;

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-10">
        {/* Progress */}
        <section className="rounded-organic-xl bg-surface px-5 py-6 sm:px-7 sm:py-8">
          <div>
            <h1 className="text-base font-semibold text-text sm:text-lg">
              Question Bank Progress
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Number of questions attempted
            </p>
          </div>

          <div className="mt-6">
            {isLoadingProgress ? (
              <div className="flex h-9 items-center gap-2 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading progress…
              </div>
            ) : (
              <>
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-out"
                    style={{
                      width: `${aggregateTotal > 0 ? aggregatePct : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex justify-between text-xs text-text-muted">
                  <span>0%</span>
                  <span className="tabular-nums">
                    {aggregateTotal > 0 ? `${aggregatePct}%` : "100%"}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Browse by subjects + cards */}
        <section className="rounded-organic-xl bg-surface px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text sm:text-lg">
                Browse By Subjects
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Target specific modules for focused exam preparation.
              </p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Look for your subject"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-organic-lg border-0 bg-surface-elevated py-2 pl-10 pr-4",
                  "text-sm text-text placeholder:text-text-muted shadow-none",
                  "outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0",
                )}
                aria-label="Search subjects"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredTiles.map((tile) => {
              const stats = tiles[tile.key];
              const pct =
                stats.total > 0
                  ? Math.min(100, Math.round((stats.attempted / stats.total) * 100))
                  : 0;
              const mins = stats.total > 0 ? Math.max(1, Math.ceil(stats.total * 1.5)) : 0;

              return (
                <div
                  key={tile.key}
                  className={cn(
                    "flex min-h-[220px] flex-col rounded-[18px] bg-surface-elevated px-6 py-5",
                    "transition-colors hover:bg-surface-mid/50",
                  )}
                >
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-1 text-center">
                    {!stats.loading && stats.total > 0 ? (
                      <p
                        className={cn(
                          "font-heading text-3xl font-bold tabular-nums leading-none tracking-tight",
                          tile.titleClass,
                        )}
                        aria-label={`${pct} percent complete`}
                      >
                        {pct}%
                      </p>
                    ) : null}
                    <div className="space-y-1">
                      <p
                        className={cn(
                          "whitespace-nowrap text-base font-semibold leading-snug",
                          tile.titleClass,
                        )}
                      >
                        {tile.headline}
                      </p>
                      <p
                        className={cn(
                          "mx-auto max-w-[14rem] truncate text-xs leading-snug",
                          tile.topicClass,
                        )}
                      >
                        {tile.topicCaps}
                      </p>
                    </div>
                    {!stats.loading && stats.total > 0 ? (
                      <p
                        className={cn(
                          "text-[11px] tabular-nums leading-none",
                          tile.statClass,
                        )}
                      >
                        {stats.attempted} of {stats.total} attempted
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "flex min-w-0 flex-nowrap items-center gap-3 text-xs whitespace-nowrap",
                          tile.statClass,
                        )}
                      >
                        <span className="tabular-nums">
                          {stats.loading ? "…" : `${stats.total} Qs`}
                        </span>
                        <span className="tabular-nums">
                          {stats.loading
                            ? "…"
                            : stats.total === 0
                              ? "—"
                              : `${mins} Min`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSessionModal(tile)}
                        className={cn(
                          "shrink-0 rounded px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-opacity",
                          "disabled:cursor-not-allowed disabled:opacity-40",
                          tile.startBtnClass,
                        )}
                      >
                        Start
                      </button>
                    </div>

                    <div
                      className={cn(
                        "mt-5 h-1 w-full overflow-hidden rounded-full",
                        tile.progressTrackClass,
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width]",
                          tile.progressFillClass,
                        )}
                        style={{ width: `${stats.loading ? 0 : pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[18px] bg-surface-elevated/30 px-4 text-center">
              <span className="text-2xl text-text-muted" aria-hidden>
                …
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                More subjects coming soon
              </p>
            </div>
          </div>
        </section>

        {/* Mixed */}
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={() => setMixedModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-semibold",
              "bg-secondary text-background shadow-glow transition-all duration-fast",
              "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
            )}
          >
            Start mixed practice
            <ChevronDown className="h-4 w-4" aria-hidden strokeWidth={2.5} />
          </button>
        </div>

        <p className="pb-8 text-center text-xs text-text-muted">
          Prefer picking individual questions?{" "}
          <Link href="/questions/library" className="font-medium text-secondary hover:underline">
            Open library
          </Link>
        </p>
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
