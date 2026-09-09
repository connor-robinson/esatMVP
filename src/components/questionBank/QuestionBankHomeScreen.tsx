"use client";

import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Atom,
  Brain,
  FlaskConical,
  FunctionSquare,
  Leaf,
  Lightbulb,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { LoadingEllipsis } from "@/components/shared/LoadingEllipsis";
import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import {
  QUESTION_BANK_HOME_LAUNCH_EVENT,
  QUESTION_BANK_HOME_LAUNCH_KEY,
} from "@/lib/questionBank/homeLaunch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import { beginHomeLaunchQuestionsPrefetch } from "@/lib/questionBank/sessionLaunchPrefetch";
import {
  FREE_TIER_LAUNCH_EVENT,
  writeFreeTierLaunch,
} from "@/lib/questionBank/freeTierLaunch";
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
import { readCachedHasAuthUser } from "@/lib/auth/sessionPresenceCache";
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

const SUBJECT_ICONS: Record<SubjectKey, LucideIcon> = {
  "Math 1": FunctionSquare,
  "Math 2": Sigma,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Leaf,
  "Paper 1": Brain,
  "Paper 2": Lightbulb,
};

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
  /** When true, tile is visible but not launchable. */
  comingSoon?: boolean;
}

const SUBJECT_TILES: SubjectTileConfig[] = [
  {
    key: "Math 1",
    headline: "ESAT Math 1",
    topicCaps: "Algebra & functions",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES["Math 1"],
  },
  {
    key: "Math 2",
    headline: "ESAT Math 2",
    topicCaps: "Sequences & calculus",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES["Math 2"],
  },
  {
    key: "Physics",
    headline: "ESAT Physics",
    topicCaps: "Mechanics & waves",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Physics,
  },
  {
    key: "Chemistry",
    headline: "ESAT Chemistry",
    topicCaps: "Structure & reactivity",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Chemistry,
  },
  {
    key: "Biology",
    headline: "ESAT Biology",
    topicCaps: "Cell & molecular biology",
    testType: "ESAT",
    ...SUBJECT_TILE_STYLES.Biology,
  },
  {
    key: "Paper 1",
    headline: "TMUA Paper 1",
    topicCaps: "Mathematical thinking",
    testType: "TMUA",
    comingSoon: true,
    ...SUBJECT_TILE_STYLES["Paper 1"],
  },
  {
    key: "Paper 2",
    headline: "TMUA Paper 2",
    topicCaps: "Mathematical reasoning",
    testType: "TMUA",
    comingSoon: true,
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
  const pathname = usePathname();
  const session = useSupabaseSession();
  const [authHint, setAuthHint] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    setAuthHint(readCachedHasAuthUser());
  }, []);
  const sessionPending = session === undefined;
  const isLoggedIn =
    sessionPending ? authHint === true : Boolean(session?.user);
  const authUnknown = sessionPending && authHint === undefined;

  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  // Never treat "still loading" as paid. That caused free/logged-out chrome to
  // flash the paid layout, then jump. Cache makes hasFullAccess correct on paint.
  const showFullAccess = hasFullAccess;
  const accessPending = subscriptionLoading;
  const {
    isLoading: freeTierLoading,
    subjectStatus,
    anyPreviewAvailable,
  } = useQuestionBankFreeTier(showFullAccess, {
    enabled: !showFullAccess && !accessPending,
    summary: true,
  });
  const freeTierPending =
    !showFullAccess && !accessPending && freeTierLoading;
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [showFreeTierBlocked, setShowFreeTierBlocked] = useState(false);
  const [blockedSubject, setBlockedSubject] = useState<FreeTierPreviewSubject | null>(
    null,
  );
  const [modalTile, setModalTile] = useState<SubjectTileConfig | null>(null);
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
    // Keep cached progress visible; only show loading if we have nothing yet.
    if (!hasAggregateRef.current) {
      setIsLoadingProgress(true);
    }

    try {
      // Paint from progress ASAP; prefs refine aggregate after without blocking the bar.
      const progressPromise = fetch(
        progressUrlSubjects(ALL_SUBJECT_KEYS, { perSubject: true }),
        { credentials: "include" },
      );
      const prefsPromise = session?.user
        ? fetch("/api/profile/preferences", { credentials: "include" })
        : Promise.resolve(null);

      const progressRes = await progressPromise;

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

      const cachedPrefs = readCachedUserPrefs();
      let preference: ExamPreference = cachedPrefs?.exam_preference ?? null;
      let userEsatSubjects: string[] = cachedPrefs?.esat_subjects ?? [];

      setAggregate(
        aggregateProgressForSubjects(json.bySubject, preference, userEsatSubjects),
      );
      setTiles(tilesFromProgress(json.bySubject, false));
      hasAggregateRef.current = true;
      setIsLoadingProgress(false);

      const prefRes = await prefsPromise;
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
        setAggregate(
          aggregateProgressForSubjects(
            json.bySubject,
            preference,
            userEsatSubjects,
          ),
        );
      } else if (!session?.user) {
        setExamPreference(null);
        setEsatSubjects([]);
      }
    } catch {
      setAggregate((prev) => prev ?? { attempted: 0, total: 0 });
      setTiles((prev) => {
        const next = { ...prev };
        ALL_SUBJECT_KEYS.forEach((k) => {
          next[k] = { ...next[k], loading: false };
        });
        return next;
      });
      setIsLoadingProgress(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    router.prefetch("/questions/questionbank");
  }, [router]);

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

  const progressSummary =
    aggregate && aggregate.total > 0
      ? `${aggregate.attempted} / ${aggregate.total} questions completed of your selected subjects`
      : progressDescription;

  const siblingTilesForModal = useMemo(
    () =>
      modalTile
        ? SUBJECT_TILES.filter(
            (t) => t.testType === modalTile.testType && !t.comingSoon,
          )
        : [],
    [modalTile],
  );

  const previewAvailableFor = useCallback(
    (subject: FreeTierPreviewSubject) => {
      const stats = subjectStatus(subject);
      return !!stats && !stats.isExhausted && stats.remaining > 0;
    },
    [subjectStatus],
  );

  const launchFreeTierPreview = (subject: FreeTierPreviewSubject) => {
    if (accessPending || freeTierPending || sessionPending) return;

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
    setShowFreeTierBlocked(false);
    setBlockedSubject(null);
    try {
      writeFreeTierLaunch(subject);
    } catch {
      /* quota / private mode */
    }
    if (pathname === "/questions/questionbank") {
      window.dispatchEvent(new Event(FREE_TIER_LAUNCH_EVENT));
      return;
    }
    router.push("/questions/questionbank");
  };

  const openSessionModal = (tile: SubjectTileConfig) => {
    if (tile.comingSoon) return;
    if (accessPending || sessionPending) return;
    if (!showFullAccess) {
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
    if (accessPending || freeTierPending || sessionPending) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const startSubject = params.get("startSubject");
    if (!startSubject || !isFreeTierPreviewSubject(startSubject)) return;
    calibrationLaunchHandled.current = true;
    const tile = SUBJECT_TILES.find((t) => t.key === startSubject);
    if (tile) openSessionModal(tile);
    router.replace("/questions", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once ready
  }, [accessPending, freeTierPending, sessionPending, showFullAccess]);

  const handleSessionConfirm = (payload: QuestionBankHomeLaunchPayload) => {
    try {
      sessionStorage.setItem(
        QUESTION_BANK_HOME_LAUNCH_KEY,
        JSON.stringify(payload),
      );
    } catch {
      /* quota / private mode */
    }
    // Overlap the questions API with the practice-route navigation.
    beginHomeLaunchQuestionsPrefetch(payload);
    if (pathname === "/questions/questionbank") {
      // Already on the practice route (home alias). Soft-push would no-op.
      window.dispatchEvent(new Event(QUESTION_BANK_HOME_LAUNCH_EVENT));
      return;
    }
    router.push("/questions/questionbank");
  };

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
        className="!rounded-[4px]"
        headline={freeTierBlockedHeadline}
        subtext={freeTierBlockedSubtext}
        ctaLabel="View plans"
      />
    ) : (
      <DrillUpgradeBanner
        variant="panel"
        className="!rounded-[4px]"
        headline="Try 10 free questions per subject"
        subtext="Preview sets for Math 1, Math 2, Physics, Chemistry and Biology. Upgrade for the full question bank."
        ctaLabel="View plans"
      />
    );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-10">
        {/* Heading (logged in) or free preview promo (logged out) */}
        {isLoggedIn ? (
          <section>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                Question Bank
              </h1>
              <p className="mt-1 text-xs text-text-muted">
                {isLoadingProgress && !aggregate ? (
                  <LoadingEllipsis />
                ) : (
                  progressSummary
                )}
              </p>
            </div>

            <div className="mt-6">
              {isLoadingProgress && !aggregate ? (
                <div className="flex h-9 items-center text-xs text-text-muted">
                  <LoadingEllipsis />
                </div>
              ) : (
                <>
                  <div
                    className="h-3 w-full overflow-hidden rounded-[2px] bg-surface-elevated"
                    role="progressbar"
                    aria-valuenow={aggregatePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall question bank progress"
                  >
                    <div
                      className="h-full rounded-[2px] bg-secondary"
                      style={{ width: `${aggregatePct}%` }}
                    />
                  </div>
                  <div className="relative mt-2.5 h-4 text-xs text-text-muted">
                    <span className="absolute left-0">0%</span>
                    {aggregatePct > 0 && aggregatePct < 100 ? (
                      <span
                        className="absolute -translate-x-1/2 tabular-nums font-medium text-text"
                        style={{ left: `${aggregatePct}%` }}
                      >
                        {aggregatePct}%
                      </span>
                    ) : null}
                    <span className="absolute right-0">100%</span>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : authUnknown ? (
          <section>
            <div className="h-8 w-48 animate-pulse rounded-md bg-surface-elevated" />
            <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded-md bg-surface-elevated" />
          </section>
        ) : (
          freeTierPromoBanner
        )}

        {/* Choose a subject + cards */}
        <section>
          <div>
            <h2 className="text-base font-semibold text-text sm:text-lg">
              Choose a subject
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Browse ESAT subjects to continue your practice. TMUA papers coming
              soon.
            </p>
          </div>

          <div className="mt-5 grid gap-x-4 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
            {SUBJECT_TILES.map((tile) => {
              const stats = tiles[tile.key];
              const previewSubject = isFreeTierPreviewSubject(tile.key)
                ? tile.key
                : null;
              const previewAvailable =
                showFullAccess ||
                accessPending ||
                (previewSubject != null && previewAvailableFor(previewSubject));
              const pct =
                stats.total > 0
                  ? Math.min(100, Math.round((stats.attempted / stats.total) * 100))
                  : 0;
              const comingSoon = !!tile.comingSoon;
              const disabled =
                comingSoon ||
                (!showFullAccess &&
                  !accessPending &&
                  !freeTierPending &&
                  !previewAvailable);
              const Icon = SUBJECT_ICONS[tile.key];

              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => openSessionModal(tile)}
                  disabled={disabled}
                  aria-disabled={disabled}
                  className={cn(
                    "flex min-h-[196px] flex-col rounded-[4px] bg-surface-elevated px-5 py-6 text-left",
                    "origin-center hover:scale-[1.03] hover:bg-surface-mid/50",
                    "outline-none ring-0 select-none [-webkit-tap-highlight-color:transparent]",
                    "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                    "active:outline-none active:ring-0",
                    "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100",
                  )}
                >
                  <div className="flex min-h-0 flex-1 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={cn(
                          "h-11 w-11 shrink-0 sm:h-12 sm:w-12",
                          tile.topicClass,
                        )}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-base font-semibold leading-snug sm:text-lg",
                            tile.topicClass,
                          )}
                        >
                          {tile.headline}
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-text-muted">
                          {comingSoon ? (
                            "Coming soon"
                          ) : stats.loading ? (
                            <LoadingEllipsis />
                          ) : (
                            `${stats.attempted} / ${stats.total} questions`
                          )}
                        </p>
                      </div>
                    </div>

                    {!comingSoon ? (
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-surface-mid text-text",
                          "origin-center hover:scale-125",
                        )}
                        aria-hidden
                      >
                        <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto flex items-center gap-3 pt-4">
                    <div
                      className={cn(
                        "h-2 min-w-0 flex-1 overflow-hidden rounded-[2px]",
                        tile.progressTrackClass,
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-[2px]",
                          tile.progressFillClass,
                        )}
                        style={{
                          width: `${comingSoon || stats.loading ? 0 : pct}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-text-muted">
                      {comingSoon
                        ? "Soon"
                        : stats.loading
                          ? "..."
                          : `${pct}%`}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="flex min-h-[196px] flex-col items-center justify-center rounded-[4px] bg-surface-elevated/30 px-4 py-9 text-center">
              <span className="text-2xl text-text-muted" aria-hidden>
                …
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                More subjects coming soon
              </p>
            </div>
          </div>
        </section>

        {!showFullAccess && !accessPending && !freeTierPending && isLoggedIn ? (
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
    </div>
  );
}
