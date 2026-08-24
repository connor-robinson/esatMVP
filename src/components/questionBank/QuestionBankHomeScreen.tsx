"use client";

import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { LoadingEllipsis } from "@/components/shared/LoadingEllipsis";
import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import { QUESTION_BANK_HOME_LAUNCH_KEY } from "@/lib/questionBank/homeLaunch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import { writeFreeTierLaunch } from "@/lib/questionBank/freeTierLaunch";
import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  FREE_TIER_PREVIEW_SUBJECTS,
  isFreeTierPreviewSubject,
  type FreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";
import { QuestionBankSessionSettingsModal } from "@/components/questionBank/QuestionBankSessionSettingsModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuestionBankFreeTier } from "@/hooks/useQuestionBankFreeTier";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  progressSubtext,
  type ExamPreference,
} from "@/lib/questionBank/userProgressSubjects";
import {
  aggregateProgressForSubjects,
  readCachedUserPrefs,
  readHomeProgressCache,
  writeCachedUserPrefs,
  writeHomeProgressCache,
} from "@/lib/questionBank/homeProgressCache";
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

function tilesFromProgress(
  bySubject: Record<string, { attempted: number; total: number }> | undefined,
  loading: boolean,
): Record<SubjectKey, { attempted: number; total: number; loading: boolean }> {
  return ALL_SUBJECT_KEYS.reduce(
    (acc, k) => {
      const row = bySubject?.[k];
      acc[k] = {
        attempted: row?.attempted ?? 0,
        total: row?.total ?? 0,
        loading,
      };
      return acc;
    },
    {} as Record<SubjectKey, { attempted: number; total: number; loading: boolean }>,
  );
}

export function QuestionBankHomeScreen() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;
  const {
    isLoading: freeTierLoading,
    subjectStatus,
    anyPreviewAvailable,
  } = useQuestionBankFreeTier(treatAsFullAccess);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [showFreeTierBlocked, setShowFreeTierBlocked] = useState(false);
  const [blockedSubject, setBlockedSubject] = useState<FreeTierPreviewSubject | null>(
    null,
  );
  const [modalTile, setModalTile] = useState<SubjectTileConfig | null>(null);
  const [mixedModalOpen, setMixedModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aggregate, setAggregate] = useState<{ attempted: number; total: number } | null>(
    null,
  );
  const [examPreference, setExamPreference] = useState<ExamPreference>(null);
  const [esatSubjects, setEsatSubjects] = useState<string[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [tiles, setTiles] = useState<
    Record<SubjectKey, { attempted: number; total: number; loading: boolean }>
  >(() => tilesFromProgress(undefined, true));
  const progressHydratedRef = useRef(false);
  const hasAggregateRef = useRef(false);

  useLayoutEffect(() => {
    if (progressHydratedRef.current) return;
    progressHydratedRef.current = true;

    const cachedPrefs = readCachedUserPrefs();
    const cachedProgress = readHomeProgressCache();
    const preference = cachedPrefs?.exam_preference ?? null;
    const userEsatSubjects = cachedPrefs?.esat_subjects ?? [];

    if (cachedPrefs) {
      setExamPreference(preference);
      setEsatSubjects(userEsatSubjects);
    }

    if (cachedProgress?.bySubject) {
      setAggregate(
        aggregateProgressForSubjects(
          cachedProgress.bySubject,
          preference,
          userEsatSubjects,
        ),
      );
      setTiles(tilesFromProgress(cachedProgress.bySubject, false));
      hasAggregateRef.current = true;
      setIsLoadingProgress(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!hasAggregateRef.current) {
      setIsLoadingProgress(true);
    }

    try {
      const prefsPromise = session?.user
        ? fetch("/api/profile/preferences", { credentials: "include" })
        : Promise.resolve(null);
      const progressPromise = fetch(
        progressUrlSubjects(ALL_SUBJECT_KEYS, { perSubject: true }),
        { credentials: "include" },
      );

      const [prefRes, progressRes] = await Promise.all([
        prefsPromise,
        progressPromise,
      ]);

      let preference: ExamPreference = readCachedUserPrefs()?.exam_preference ?? null;
      let userEsatSubjects: string[] = readCachedUserPrefs()?.esat_subjects ?? [];

      if (prefRes?.ok) {
        const prefJson = await prefRes.json();
        preference =
          prefJson.exam_preference === "ESAT" ||
          prefJson.exam_preference === "TMUA"
            ? prefJson.exam_preference
            : null;
        userEsatSubjects = Array.isArray(prefJson.esat_subjects)
          ? prefJson.esat_subjects
          : [];
        setExamPreference(preference);
        setEsatSubjects(userEsatSubjects);
        if (session?.user) {
          writeCachedUserPrefs({
            exam_preference: preference,
            esat_subjects: userEsatSubjects,
          });
        }
      } else if (!session?.user) {
        setExamPreference(null);
        setEsatSubjects([]);
      }

      const json: ProgressApiResponse = progressRes.ok
        ? await progressRes.json()
        : { attempted: 0, total: 0, bySubject: {} };

      if (json.bySubject) {
        writeHomeProgressCache({
          attempted: json.attempted,
          total: json.total,
          bySubject: json.bySubject,
        });
      }

      setAggregate(
        aggregateProgressForSubjects(json.bySubject, preference, userEsatSubjects),
      );
      setTiles(tilesFromProgress(json.bySubject, false));
      hasAggregateRef.current = true;
    } catch {
      setAggregate((prev) => prev ?? { attempted: 0, total: 0 });
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
  }, [session?.user]);

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

  const progressDescription = progressSubtext(
    examPreference,
    esatSubjects,
    aggregate?.attempted ?? 0,
    aggregate?.total ?? 0,
  );

  const siblingTilesForModal = useMemo(
    () =>
      modalTile
        ? SUBJECT_TILES.filter((t) => t.testType === modalTile.testType)
        : [],
    [modalTile],
  );

  const previewAvailableFor = useCallback(
    (subject: FreeTierPreviewSubject) => {
      const stats = subjectStatus(subject);
      return (
        !!stats &&
        !stats.isExhausted &&
        stats.remaining > 0 &&
        stats.remainingQuestions.length > 0
      );
    },
    [subjectStatus],
  );

  const launchFreeTierPreview = (subject: FreeTierPreviewSubject) => {
    if (freeTierLoading) return;

    const stats = subjectStatus(subject);
    if (!stats) {
      setBlockedSubject(null);
      setShowFreeTierBlocked(true);
      return;
    }
    if (stats.isExhausted || stats.remaining <= 0) {
      setBlockedSubject(subject);
      setShowFreeTierBlocked(true);
      return;
    }
    if (stats.remainingQuestions.length === 0) {
      setBlockedSubject(null);
      setShowFreeTierBlocked(true);
      return;
    }
    setShowFreeTierBlocked(false);
    setBlockedSubject(null);
    try {
      writeFreeTierLaunch(subject);
    } catch {
      /* quota / private mode */
    }
    router.push("/questions/questionbank");
  };

  const launchMixedFreePreview = () => {
    const firstAvailable = FREE_TIER_PREVIEW_SUBJECTS.find((subject) =>
      previewAvailableFor(subject),
    );
    if (!firstAvailable) {
      setBlockedSubject(null);
      setShowFreeTierBlocked(true);
      return;
    }
    launchFreeTierPreview(firstAvailable);
  };

  const openSessionModal = (tile: SubjectTileConfig) => {
    if (!treatAsFullAccess) {
      if (isFreeTierPreviewSubject(tile.key)) {
        launchFreeTierPreview(tile.key);
      } else {
        setBlockedSubject(null);
        setShowFreeTierBlocked(true);
      }
      return;
    }
    setModalTile(tile);
    setSessionModalOpen(true);
  };

  // Deep-link: /questions?startSubject=Math%201 (calibration / converter)
  const calibrationLaunchHandled = useRef(false);
  useEffect(() => {
    if (calibrationLaunchHandled.current) return;
    if (subscriptionLoading || freeTierLoading) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const startSubject = params.get("startSubject");
    if (!startSubject || !isFreeTierPreviewSubject(startSubject)) return;
    calibrationLaunchHandled.current = true;
    const tile = SUBJECT_TILES.find((t) => t.key === startSubject);
    if (tile) openSessionModal(tile);
    router.replace("/questions", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once ready
  }, [subscriptionLoading, freeTierLoading, treatAsFullAccess]);

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

  const isLoggedIn = Boolean(session?.user);

  const freeTierBlockedHeadline = blockedSubject
    ? `You've used your ${FREE_TIER_LIMIT_PER_SUBJECT} free ${blockedSubject} questions`
    : anyPreviewAvailable === false
      ? "Free preview unavailable"
      : "Upgrade to unlock this subject";

  const freeTierBlockedSubtext = blockedSubject
    ? `Upgrade for unlimited ${blockedSubject} practice and every other subject.`
    : anyPreviewAvailable === false
      ? "Preview questions are not available right now. Try again shortly or upgrade for full access."
      : 'Upgrade for unlimited practice sessions across every subject and difficulty.';

  const freeTierPromoBanner =
    showFreeTierBlocked ? (
      <DrillUpgradeBanner
        variant="panel"
        headline={freeTierBlockedHeadline}
        subtext={freeTierBlockedSubtext}
        ctaLabel="View plans"
      />
    ) : (
      <DrillUpgradeBanner
        variant="panel"
        headline="Try 10 free questions per subject"
        subtext="Preview sets for Math 1, Math 2, Physics, Chemistry and Biology. Upgrade for the full question bank."
        ctaLabel="View plans"
      />
    );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-10">
        {/* Progress (logged in) or free preview promo (logged out) */}
        {isLoggedIn ? (
          <section className="space-y-4">
            <div className="rounded-organic-xl bg-surface px-5 py-6 sm:px-7 sm:py-8">
            <div>
              <h1 className="text-base font-semibold text-text sm:text-lg">
                Question Bank Progress
              </h1>
              <p className="mt-1 text-xs text-text-muted">
                {progressDescription}
              </p>
            </div>

            <div className="mt-6">
              {isLoadingProgress ? (
                <div className="flex h-9 items-center text-xs text-text-muted">
                  <LoadingEllipsis />
                </div>
              ) : (
                <>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-out"
                      style={{
                        width: `${aggregatePct}%`,
                      }}
                    />
                  </div>
                  <div className="relative mt-2.5 h-4 text-xs text-text-muted">
                    <span className="absolute left-0">0%</span>
                    {aggregatePct > 0 && aggregatePct < 100 && (
                      <span
                        className="absolute -translate-x-1/2 tabular-nums font-medium text-text"
                        style={{ left: `${aggregatePct}%` }}
                      >
                        {aggregatePct}%
                      </span>
                    )}
                    <span className="absolute right-0">100%</span>
                  </div>
                </>
              )}
            </div>
            </div>
          </section>
        ) : freeTierLoading ? (
          <section className="rounded-organic-xl bg-surface px-5 py-8 sm:px-7">
            <div className="flex h-9 items-center text-xs text-text-muted">
              <LoadingEllipsis />
            </div>
          </section>
        ) : (
          freeTierPromoBanner
        )}

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
              const previewSubject = isFreeTierPreviewSubject(tile.key)
                ? tile.key
                : null;
              const subjectFree = previewSubject
                ? subjectStatus(previewSubject)
                : null;
              const previewAvailable =
                treatAsFullAccess ||
                (previewSubject != null && previewAvailableFor(previewSubject));
              const pct =
                stats.total > 0
                  ? Math.min(100, Math.round((stats.attempted / stats.total) * 100))
                  : 0;
              return (
                <div
                  key={tile.key}
                  className={cn(
                    "flex min-h-[220px] flex-col rounded-[18px] bg-surface-elevated px-6 py-5",
                    "transition-colors hover:bg-surface-mid/50",
                  )}
                >
                  <div className="flex flex-1 items-center justify-center px-1 text-center">
                    <p className="whitespace-nowrap text-base font-semibold leading-snug sm:text-lg">
                      <span className="text-text">{tile.testType} · </span>
                      <span className={tile.topicClass}>{tile.key}</span>
                    </p>
                  </div>

                  <div className="pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "min-w-0 truncate text-xs tabular-nums whitespace-nowrap",
                          tile.statClass,
                        )}
                      >
                        {stats.loading ? (
                          <LoadingEllipsis className={tile.statClass} />
                        ) : (
                          `${stats.attempted} / ${stats.total} Qs done`
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => openSessionModal(tile)}
                        disabled={
                          !treatAsFullAccess &&
                          !freeTierLoading &&
                          !previewAvailable
                        }
                        className={cn(
                          "shrink-0 rounded px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-opacity",
                          "disabled:cursor-not-allowed disabled:opacity-40",
                          tile.startBtnClass,
                        )}
                      >
                        {treatAsFullAccess
                          ? "Start"
                          : previewSubject
                            ? subjectFree?.isExhausted
                              ? "Limit reached"
                              : "Preview"
                            : "Upgrade"}
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

        {!treatAsFullAccess && !freeTierLoading && isLoggedIn ? (
          <section className="space-y-4">
            <p className="text-center text-sm text-text-muted">
              Free preview limits (per subject):{" "}
              {FREE_TIER_PREVIEW_SUBJECTS.map((subject, index) => {
                const row = subjectStatus(subject);
                return (
                  <span key={subject}>
                    {index > 0 ? " · " : ""}
                    {subject} {row?.attemptedCount ?? 0}/{FREE_TIER_LIMIT_PER_SUBJECT}
                  </span>
                );
              })}
            </p>
            {freeTierPromoBanner}
          </section>
        ) : null}

        {/* Mixed */}
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={() => {
              if (!treatAsFullAccess) {
                launchMixedFreePreview();
                return;
              }
              setMixedModalOpen(true);
            }}
            disabled={
              !treatAsFullAccess &&
              !freeTierLoading &&
              anyPreviewAvailable !== true
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-semibold",
              "bg-secondary text-background shadow-glow transition-all duration-fast",
              "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            {treatAsFullAccess ? "Start mixed practice" : "Start free preview"}
            <ChevronDown className="h-4 w-4" aria-hidden strokeWidth={2.5} />
          </button>
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
