"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Clock,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { QUESTION_BANK_HOME_LAUNCH_KEY } from "@/lib/questionBank/homeLaunch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import { QuestionBankSessionSettingsModal } from "@/components/questionBank/QuestionBankSessionSettingsModal";
import { cn } from "@/lib/utils";

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

/** Subject-colored text on neutral cards; subtext/track use muted theme-aware shades. */
const SUBJECT_COLOR_STYLES = {
  accent: {
    titleClass: "text-accent",
    topicClass: "text-accent/55 dark:text-accent/40",
    statClass: "text-accent/45 dark:text-accent/30",
    progressFillClass: "bg-accent",
    progressTrackClass: "bg-accent/30 dark:bg-accent/20",
    startBtnClass: "bg-accent text-background hover:opacity-90",
  },
  warning: {
    titleClass: "text-warning",
    topicClass: "text-warning/55 dark:text-warning/40",
    statClass: "text-warning/45 dark:text-warning/30",
    progressFillClass: "bg-warning",
    progressTrackClass: "bg-warning/30 dark:bg-warning/20",
    startBtnClass: "bg-warning text-background hover:opacity-90",
  },
  secondary: {
    titleClass: "text-secondary",
    topicClass: "text-secondary/55 dark:text-secondary/40",
    statClass: "text-secondary/45 dark:text-secondary/30",
    progressFillClass: "bg-secondary",
    progressTrackClass: "bg-secondary/30 dark:bg-secondary/20",
    startBtnClass: "bg-secondary text-background hover:opacity-90",
  },
  error: {
    titleClass: "text-error",
    topicClass: "text-error/55 dark:text-error/40",
    statClass: "text-error/45 dark:text-error/30",
    progressFillClass: "bg-error",
    progressTrackClass: "bg-error/30 dark:bg-error/20",
    startBtnClass: "bg-error text-background hover:opacity-90",
  },
  primary: {
    titleClass: "text-primary",
    topicClass: "text-primary/55 dark:text-primary/40",
    statClass: "text-primary/45 dark:text-primary/30",
    progressFillClass: "bg-primary",
    progressTrackClass: "bg-primary/30 dark:bg-primary/20",
    startBtnClass: "bg-primary text-background hover:opacity-90",
  },
  text: {
    titleClass: "text-text",
    topicClass: "text-text/55 dark:text-text/40",
    statClass: "text-text/45 dark:text-text/35",
    progressFillClass: "bg-text",
    progressTrackClass: "bg-text/30 dark:bg-text/20",
    startBtnClass: "bg-text text-background hover:opacity-90",
  },
} as const;

const SUBJECT_TILES: SubjectTileConfig[] = [
  {
    key: "Math 1",
    headline: "ESAT — Math 1",
    topicCaps: "Algebra & functions",
    testType: "ESAT",
    ...SUBJECT_COLOR_STYLES.accent,
  },
  {
    key: "Math 2",
    headline: "ESAT — Math 2",
    topicCaps: "Sequences & calculus",
    testType: "ESAT",
    ...SUBJECT_COLOR_STYLES.warning,
  },
  {
    key: "Physics",
    headline: "ESAT — Physics",
    topicCaps: "Mechanics & waves",
    testType: "ESAT",
    ...SUBJECT_COLOR_STYLES.secondary,
  },
  {
    key: "Chemistry",
    headline: "ESAT — Chemistry",
    topicCaps: "Structure & reactivity",
    testType: "ESAT",
    ...SUBJECT_COLOR_STYLES.error,
  },
  {
    key: "Biology",
    headline: "ESAT — Biology",
    topicCaps: "Cell & molecular biology",
    testType: "ESAT",
    ...SUBJECT_COLOR_STYLES.primary,
  },
  {
    key: "Paper 1",
    headline: "TMUA — Paper 1",
    topicCaps: "Mathematical thinking",
    testType: "TMUA",
    ...SUBJECT_COLOR_STYLES.text,
  },
  {
    key: "Paper 2",
    headline: "TMUA — Paper 2",
    topicCaps: "Mathematical reasoning",
    testType: "TMUA",
    ...SUBJECT_COLOR_STYLES.text,
  },
];

function progressUrlSubjects(subjects: readonly string[]): string {
  const q = encodeURIComponent(subjects.join(","));
  return `/api/question-bank/progress?subjects=${q}`;
}

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
        <section className="rounded-organic-xl bg-surface px-5 py-6 sm:px-8 sm:py-8">
          <div>
            <h1 className="text-lg font-semibold text-text sm:text-xl">
              Question Bank Progress
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Number of questions attempted
            </p>
          </div>

          <div className="mt-6">
            {isLoadingProgress ? (
              <div className="flex h-10 items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
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
                <div className="mt-2 flex justify-between text-xs text-text-muted">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Browse by subjects */}
        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text sm:text-xl">
                Browse By Subjects
              </h2>
              <p className="mt-1 text-sm text-text-muted">
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
                  "h-11 w-full rounded-organic-lg bg-surface-elevated py-2 pl-10 pr-4",
                  "text-sm text-text placeholder:text-text-muted",
                  "outline-none ring-0 focus:outline-none focus:ring-1 focus:ring-secondary/25",
                )}
                aria-label="Search subjects"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
                    "relative flex min-h-[270px] flex-col rounded-[18px] bg-surface-elevated px-6 pb-6 pt-10",
                    "transition-colors hover:bg-surface-mid/50",
                  )}
                >
                  <button
                    type="button"
                    disabled={stats.loading || stats.total === 0}
                    onClick={() => openSessionModal(tile)}
                    className={cn(
                      "absolute right-6 top-10 shrink-0 rounded px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-opacity",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                      tile.startBtnClass,
                    )}
                  >
                    Start
                  </button>

                  <div className="min-h-[5rem] pr-24">
                    <p
                      className={cn(
                        "text-lg font-semibold leading-snug",
                        tile.titleClass,
                      )}
                    >
                      {tile.headline}
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                        tile.topicClass,
                      )}
                    >
                      {tile.topicCaps}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-3 text-xs",
                        tile.statClass,
                      )}
                    >
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {stats.loading ? "…" : `${stats.total} Qs`}
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {stats.loading ? "…" : stats.total === 0 ? "—" : `${mins} Min`}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "mt-8 h-1 w-full overflow-hidden rounded-full",
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

            <div className="flex min-h-[270px] flex-col items-center justify-center rounded-[18px] bg-surface-elevated/30 px-4 text-center">
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
