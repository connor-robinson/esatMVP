"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Search, Loader2 } from "lucide-react";
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
  accentBarClass: string;
  startBtnClass: string;
}

const SUBJECT_TILES: SubjectTileConfig[] = [
  {
    key: "Math 1",
    headline: "ESAT — Math 1",
    topicCaps: "Algebra & functions",
    testType: "ESAT",
    titleClass: "text-accent",
    accentBarClass: "bg-accent",
    startBtnClass: "bg-accent text-background hover:opacity-90",
  },
  {
    key: "Math 2",
    headline: "ESAT — Math 2",
    topicCaps: "Sequences & calculus",
    testType: "ESAT",
    titleClass: "text-warning",
    accentBarClass: "bg-warning",
    startBtnClass: "bg-warning text-background hover:opacity-90",
  },
  {
    key: "Physics",
    headline: "ESAT — Physics",
    topicCaps: "Mechanics & waves",
    testType: "ESAT",
    titleClass: "text-secondary",
    accentBarClass: "bg-secondary",
    startBtnClass: "bg-secondary text-background hover:opacity-90",
  },
  {
    key: "Chemistry",
    headline: "ESAT — Chemistry",
    topicCaps: "Structure & reactivity",
    testType: "ESAT",
    titleClass: "text-error",
    accentBarClass: "bg-error",
    startBtnClass: "bg-error text-background hover:opacity-90",
  },
  {
    key: "Biology",
    headline: "ESAT — Biology",
    topicCaps: "Cell & molecular biology",
    testType: "ESAT",
    titleClass: "text-primary",
    accentBarClass: "bg-primary",
    startBtnClass: "bg-primary text-background hover:opacity-90",
  },
  {
    key: "Paper 1",
    headline: "TMUA — Paper 1",
    topicCaps: "Mathematical thinking",
    testType: "TMUA",
    titleClass: "text-text",
    accentBarClass: "bg-text-muted",
    startBtnClass: "bg-surface-neutral text-text hover:bg-surface-mid",
  },
  {
    key: "Paper 2",
    headline: "TMUA — Paper 2",
    topicCaps: "Mathematical reasoning",
    testType: "TMUA",
    titleClass: "text-text",
    accentBarClass: "bg-text-muted",
    startBtnClass: "bg-surface-neutral text-text hover:bg-surface-mid",
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
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-12 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-8">
        {/* Progress */}
        <section className="rounded-organic-xl bg-surface px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-text sm:text-xl">
                Question Bank Progress
              </h1>
              <p className="mt-0.5 text-sm text-text-muted">
                Questions attempted across your subjects
              </p>
            </div>
            {!isLoadingProgress && aggregate && aggregate.total > 0 && (
              <p className="text-sm font-medium tabular-nums text-secondary">
                {aggregate.attempted} / {aggregate.total}
                <span className="ml-1.5 text-text-muted">({aggregatePct}%)</span>
              </p>
            )}
          </div>

          <div className="mt-4">
            {isLoadingProgress ? (
              <div className="flex h-8 items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading progress…
              </div>
            ) : (
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-out"
                  style={{
                    width: `${aggregateTotal > 0 ? aggregatePct : 0}%`,
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Start a session */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">Start a session</h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Choose a subject to practice or mix topics in one session
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Look for your subject"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-organic-lg bg-surface-elevated py-2 pl-10 pr-4",
                  "text-sm text-text placeholder:text-text-muted",
                  "outline-none ring-0 focus:outline-none focus:ring-1 focus:ring-secondary/25",
                )}
                aria-label="Search subjects"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredTiles.map((tile) => {
              const stats = tiles[tile.key];
              const pct =
                stats.total > 0
                  ? Math.min(100, Math.round((stats.attempted / stats.total) * 100))
                  : 0;

              return (
                <div
                  key={tile.key}
                  className="flex flex-col rounded-organic-lg bg-surface-elevated px-5 py-5 transition-colors hover:bg-surface-mid/50"
                >
                  <p
                    className={cn(
                      "text-lg font-semibold leading-snug",
                      tile.titleClass,
                    )}
                  >
                    {tile.headline}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">{tile.topicCaps}</p>

                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-neutral">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width]",
                        tile.accentBarClass,
                      )}
                      style={{ width: `${stats.loading ? 0 : pct}%`, opacity: 0.85 }}
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-text-muted tabular-nums">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {stats.loading
                        ? "…"
                        : stats.total === 0
                          ? "No questions"
                          : `${stats.total} questions`}
                    </span>
                    <button
                      type="button"
                      disabled={stats.loading || stats.total === 0}
                      onClick={() => openSessionModal(tile)}
                      className={cn(
                        "shrink-0 rounded-organic-md px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-opacity",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        tile.startBtnClass,
                      )}
                    >
                      Start
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-organic-lg bg-surface-elevated/40 px-4 py-8 text-center">
              <p className="text-sm text-text-muted">More subjects coming soon</p>
            </div>
          </div>
        </section>

        {/* Mixed + library */}
        <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:justify-center sm:gap-6">
          <button
            type="button"
            onClick={() => setMixedModalOpen(true)}
            className={cn(
              "rounded-full px-9 py-3 text-sm font-semibold",
              "bg-secondary text-background shadow-glow transition-all duration-fast",
              "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
            )}
          >
            Start mixed practice
          </button>
          <p className="text-sm text-text-muted">
            Or{" "}
            <Link
              href="/questions/library"
              className="font-medium text-secondary hover:underline"
            >
              browse the library
            </Link>
          </p>
        </div>
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
