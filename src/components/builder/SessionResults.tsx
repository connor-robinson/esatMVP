/**
 * Session results component with per-topic breakdown
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BuilderSession, QuestionAttempt } from "@/types/core";
import {
  calculateSessionScore,
  averageQuestionDifficulty,
  fetchTopicRankings,
  buildLeaderboardWindow,
} from "@/lib/analytics";
import { SESSION_SCORE_DISPLAY_MAX } from "@/lib/session-score";
import {
  computeAttemptAccuracyStats,
  computeSessionOutcomeStats,
  computeTopicAttemptStats,
  computeTopicOutcomeStats,
  buildSessionProgressByQuestion,
  averageDifficultyForSession,
} from "@/lib/session-stats";
import { getDisplayFolderName } from "@/lib/display-folder-registry";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { 
  ArrowLeft, 
  Clock, 
  Target, 
  Zap, 
  Trophy, 
  Info, 
  X, 
  Users, 
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMiniChart } from "@/components/analytics/SessionMiniChart";
import { SessionProgressPoint } from "@/types/analytics";

interface SessionResultsProps {
  session: BuilderSession;
  attempts: QuestionAttempt[];
  onBackToBuilder: () => void;
  mode?: "standard" | "mental-math";
}

type RankingView = "personal" | "global";

export function SessionResults({ session, attempts, onBackToBuilder, mode = "standard" }: SessionResultsProps) {
  const supabase = useSupabaseClient();
  const authSession = useSupabaseSession();
  const isLoggedIn = Boolean(authSession?.user);
  const mentalMathUi = mode === "mental-math";
  /** Topic breakdown + leaderboard rows: Space Grotesk for drill, mono elsewhere */
  const topicStatsFontClass = mentalMathUi ? "font-sans tabular-nums tracking-tight" : "font-mono";
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [rankingView, setRankingView] = useState<RankingView>("personal");
  const [rankingsData, setRankingsData] = useState<Record<string, any>>({});
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setSignInLoading(true);
      const redirectTo = "/mental-maths/drill";
      const { error } = await signInWithGoogle(supabase, redirectTo);
      if (error) throw error;
    } catch {
      setSignInLoading(false);
    }
  };

  // CENTRAL CALCULATION: All session-level stats calculated here from attempts
  // This ensures consistency across all displays (top cards, highlighted cards, etc.)
  const result = useMemo(() => {
    const questionOutcome = computeSessionOutcomeStats(session, attempts);
    const attemptOutcome = computeAttemptAccuracyStats(attempts);
    const displayOutcome = mentalMathUi ? attemptOutcome : questionOutcome;

    const totalQuestions = mentalMathUi
      ? attemptOutcome.totalAttempts
      : questionOutcome.totalQuestions;
    const correctAnswers = mentalMathUi
      ? attemptOutcome.correctAttempts
      : questionOutcome.correctAnswers;
    const {
      accuracy,
      averageTimeMs,
      fastestTimeMs,
      slowestTimeMs,
    } = displayOutcome;

    const sessionAvgDifficulty = averageDifficultyForSession(session, attempts);
    const score = calculateSessionScore(
      questionOutcome.correctAnswers,
      questionOutcome.totalQuestions,
      questionOutcome.averageTimeMs,
      { avgDifficulty: sessionAvgDifficulty },
    );

    const topicRows = mentalMathUi
      ? computeTopicAttemptStats(session, attempts)
      : computeTopicOutcomeStats(session, attempts);

    const topicBreakdown = topicRows.map((stats) => {
      const avgTimeMs = stats.total
        ? stats.times.reduce((sum, t) => sum + t, 0) / stats.total
        : 0;
      const avgDifficulty = averageQuestionDifficulty(stats.difficulties);
      const topicQuestionStats = computeTopicOutcomeStats(session, attempts).find(
        (row) => row.topicId === stats.topicId,
      );
      const topicScore = calculateSessionScore(
        topicQuestionStats?.correct ?? stats.correct,
        topicQuestionStats?.total ?? stats.total,
        avgTimeMs,
        { avgDifficulty },
      );

      return {
        topicId: stats.topicId,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total ? (stats.correct / stats.total) * 100 : 0,
        avgTimeMs,
        score: topicScore,
      };
    });

    const progressData: SessionProgressPoint[] = buildSessionProgressByQuestion(
      session,
      attempts,
    );

    return {
      session,
      totalQuestions,
      correctAnswers,
      accuracy,
      averageTimeMs,
      fastestTimeMs,
      slowestTimeMs,
      score,
      topicBreakdown,
      progressData,
    };
  }, [attempts, session, mentalMathUi]);

  // Load rankings data for each topic - refetch when session changes
  useEffect(() => {
    if (result.topicBreakdown.length === 0) return;

    const loadAllRankings = async () => {
      setIsLoadingRankings(true);
      const newRankings: Record<string, any> = {};
      const userId = authSession?.user?.id || "anonymous";

      for (const topic of result.topicBreakdown) {
        try {
          // Log the exact values being passed to ensure consistency
          
          const rankings = await fetchTopicRankings(
            supabase,
            topic.topicId,
            userId,
            session.id,
            {
              score: topic.score,
              correctAnswers: topic.correct,
              totalQuestions: topic.total,
              avgTimeMs: topic.avgTimeMs,
            }
          );
          
          
          newRankings[topic.topicId] = rankings;
        } catch (error) {
        }
      }
      
      setRankingsData(newRankings);
      setIsLoadingRankings(false);
    };

    // Add a small delay to ensure database has been updated after session completion
    // This allows time for the analytics to be saved before we fetch rankings
    const timeoutId = setTimeout(() => {
      loadAllRankings();
    }, 1000); // 1 second delay to ensure database is updated

    return () => clearTimeout(timeoutId);
  }, [authSession?.user?.id, result.topicBreakdown, session.id, supabase]);

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getInitials = (username: string) => {
    if (!username || username === "You" || username === "Anonymous User") return "?";
    const words = username.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const renderSingleCard = (session: any, isGlobalView: boolean, idx: number, topicName: string, currentSessionId?: string) => {
    // Validate session data
    if (!session || typeof session.score !== 'number') {
      return null;
    }
    
    // Only highlight if it's the current session (matches the session.id we're viewing)
    // Check if builder_session_id matches currentSessionId, or if isCurrent flag is set and IDs match
    const isHighlighted = Boolean(
      currentSessionId &&
        (session.builder_session_id === currentSessionId || session.isCurrent),
    );

    const hlOnGreen = isHighlighted && mentalMathUi;
    const hlText = hlOnGreen
      ? "text-white"
      : isHighlighted
        ? "text-background"
        : "text-text";
    const hlMuted = hlOnGreen
      ? "text-white/85"
      : isHighlighted
        ? "text-background/80"
        : "text-text-muted";
    const hlSubtle = hlOnGreen
      ? "text-white/70"
      : isHighlighted
        ? "text-background/70"
        : "text-text-subtle";
    const hlRank = hlOnGreen
      ? "text-white"
      : isHighlighted
        ? "text-background"
        : mentalMathUi
          ? "text-text-muted"
          : "text-primary";
    const hlAccent = hlOnGreen
      ? "text-white"
      : isHighlighted
        ? "text-background"
        : mentalMathUi
          ? "text-success"
          : "text-primary";
    const hlAvatarBg = hlOnGreen
      ? "bg-white/25"
      : "bg-surface-mid";

    const scorePercentage = (session.score / SESSION_SCORE_DISPLAY_MAX) * 100;
    const showProgressBar = session.rank <= 3 || isHighlighted;

    const leaderboardProgressBar = showProgressBar ? (
      mentalMathUi ? (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1",
            isHighlighted ? "bg-black/10 dark:bg-black/20" : "bg-border-subtle/60",
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePercentage}%` }}
            transition={{ duration: 0.8, delay: idx * 0.05 }}
            className={cn(
              "h-full",
              isHighlighted ? "bg-white/40 dark:bg-gray-950/25" : "bg-success/45",
            )}
          />
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-border-subtle">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePercentage}%` }}
            transition={{ duration: 0.8, delay: idx * 0.05 }}
            className="h-full bg-primary/40"
          />
        </div>
      )
    ) : null;

    // For global view, use column-based layout
    if (isGlobalView) {
      if (mentalMathUi) {
        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={cn(
              "relative overflow-hidden rounded-organic-lg transition-colors",
              isHighlighted ? highlightedSessionClass : "bg-surface-mid hover:bg-surface-neutral/60",
            )}
          >
            {leaderboardProgressBar}
            <div
              className={cn(
                "relative z-10 grid items-center gap-x-8 gap-y-3 px-6 py-5 sm:gap-x-12 sm:px-8 sm:py-6",
                "grid-cols-[2.5rem_minmax(6.5rem,auto)_minmax(0,1fr)_4.5rem_4.5rem_4.5rem]",
                topicStatsFontClass,
              )}
            >
              <div className={cn("text-center text-sm font-bold tabular-nums", hlRank)}>{session.rank}</div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-4xl font-bold tabular-nums leading-none sm:text-[2.75rem]", hlText)}>
                  {session.score}
                </span>
                <span className={cn("text-sm font-semibold", hlMuted)}>/{SESSION_SCORE_DISPLAY_MAX}</span>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg", hlAvatarBg)}>
                  {session.avatar ? (
                    <img
                      src={session.avatar}
                      alt={session.username}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium ${hlMuted}">${getInitials(session.username)}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className={cn("text-xs font-semibold", hlMuted)}>{getInitials(session.username)}</span>
                  )}
                </div>
                <span className={cn("truncate text-sm font-semibold", hlText)}>{session.username}</span>
              </div>
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums", hlAccent)}>{session.accuracy.toFixed(0)}%</div>
                <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Accuracy</div>
              </div>
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums", hlText)}>{formatTimeMs(session.avgTimeMs)}</div>
                <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Pace</div>
              </div>
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums", hlText)}>
                  {session.correctAnswers}/{session.totalQuestions}
                </div>
                <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Correct</div>
              </div>
            </div>
          </motion.div>
        );
      }
      
      return (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
            className={cn(
              "relative overflow-hidden rounded-organic-md p-5 transition-colors",
              isHighlighted
                ? highlightedSessionClass
                : "bg-surface-subtle hover:bg-surface-mid/80",
            )}
        >
          {leaderboardProgressBar}

          {/* Content Grid */}
          <div className="relative z-10 grid grid-cols-12 items-center gap-4">
            {/* Rank */}
            <div className="col-span-1 flex items-center justify-center">
              <div className={cn("text-lg font-bold tabular-nums", hlRank, topicStatsFontClass)}>
                {session.rank}
              </div>
            </div>

            {/* Avatar + Name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg",
                  hlAvatarBg,
                )}
              >
                {session.avatar ? (
                  <img 
                    src={session.avatar} 
                    alt={session.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-xs font-medium ${isHighlighted ? "text-background/90" : "text-text-muted"}">${getInitials(session.username)}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className={cn("text-xs font-medium", hlMuted)}>
                    {getInitials(session.username)}
                  </span>
                )}
              </div>
              <span className={cn("truncate text-sm font-medium", hlText)}>
                {session.username}
              </span>
            </div>

            {/* Score */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums", hlText, topicStatsFontClass)}>
                  {session.score}
                </div>
                <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>
                  / 1000
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-base font-bold", hlAccent, topicStatsFontClass)}>
                  {session.accuracy.toFixed(0)}%
                </div>
                <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>accuracy</div>
              </div>
            </div>

            {/* Speed */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums", hlText, topicStatsFontClass)}>
                  {formatTimeMs(session.avgTimeMs)}
                </div>
                <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>per question</div>
              </div>
            </div>

            {/* Questions */}
            <div className="col-span-1 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-sm font-semibold tabular-nums", hlText, topicStatsFontClass)}>
                  {session.correctAnswers}/{session.totalQuestions}
                </div>
                <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>correct</div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (mentalMathUi) {
      return (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className={cn(
            "relative overflow-hidden rounded-organic-lg transition-colors",
            isHighlighted ? highlightedSessionClass : "bg-surface-mid hover:bg-surface-neutral/60",
          )}
        >
          {leaderboardProgressBar}
          <div
            className={cn(
              "relative z-10 grid items-center gap-x-8 gap-y-3 px-6 py-5 sm:gap-x-12 sm:px-8 sm:py-6",
              "grid-cols-[2.5rem_minmax(6.5rem,auto)_4.5rem_5rem_4.5rem_minmax(0,1fr)]",
              topicStatsFontClass,
            )}
          >
          <div className={cn("text-center text-sm font-bold tabular-nums", hlRank)}>{session.rank}</div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-4xl font-bold tabular-nums leading-none sm:text-[2.75rem]", hlText)}>
              {session.score}
            </span>
            <span className={cn("text-sm font-semibold", hlMuted)}>/{SESSION_SCORE_DISPLAY_MAX}</span>
          </div>
          <div className="text-right">
            <div className={cn("text-base font-bold tabular-nums", hlAccent)}>{session.accuracy.toFixed(0)}%</div>
            <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Accuracy</div>
          </div>
          <div className="text-right">
            <div className={cn("text-base font-bold tabular-nums", hlText)}>
              {session.correctAnswers}/{session.totalQuestions}
            </div>
            <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Correct</div>
          </div>
          <div className="text-right">
            <div className={cn("text-base font-bold tabular-nums", hlText)}>{formatTimeMs(session.avgTimeMs)}</div>
            <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", hlMuted)}>Pace</div>
          </div>
          <div className={cn("text-right text-xs font-medium", hlSubtle)}>
            {session.timestamp ? (
              <>
                {new Date(session.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <span className="mx-2 opacity-40">·</span>
                {new Date(session.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </>
            ) : (
              "—"
            )}
          </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.03 }}
        className={cn(
          sessionRowSurface,
          "relative overflow-hidden transition-colors",
          "p-3",
          isHighlighted
            ? highlightedSessionClass
            : "hover:bg-surface-neutral/60",
        )}
      >
        {leaderboardProgressBar}
        <div className="relative z-10 flex items-center gap-6">
          {/* Rank Number - Leftmost */}
          <div className="flex-shrink-0">
            <div className={cn("text-lg font-bold tabular-nums", hlRank, topicStatsFontClass)}>
              {session.rank}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Score and Topic Row */}
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className={cn("text-xl font-bold tabular-nums", hlText, topicStatsFontClass)}>
                  {session.score}
                </span>
                <span className={cn("text-sm", hlMuted, topicStatsFontClass)}>
                  / {SESSION_SCORE_DISPLAY_MAX}
                </span>
                <span className={cn("truncate text-xs", hlSubtle, topicStatsFontClass)}>
                  {topicName}
                </span>
              </div>
              <span className={cn("flex-shrink-0 text-xs", hlMuted, topicStatsFontClass)}>
                {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>

          {/* Right Side Stats */}
          <div className="flex-shrink-0 text-right">
            <div className="space-y-1">
              <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>
                {formatTimeMs(session.avgTimeMs)} <span className={hlSubtle}>/ q</span>
              </div>
              <div className={cn("text-xs", hlMuted, topicStatsFontClass)}>
                {session.correctAnswers}/{session.totalQuestions}{" "}
                <span className={hlSubtle}>correct</span>
              </div>
              <div className={cn("text-xs font-bold", hlAccent, topicStatsFontClass)}>
                {session.accuracy.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const getTopicRankingSnapshot = (topicId: string) => {
    const t = result.topicBreakdown.find((x) => x.topicId === topicId);
    if (!t) return null;
    return {
      score: t.score,
      correctAnswers: t.correct,
      totalQuestions: t.total,
      avgTimeMs: t.avgTimeMs,
      accuracy: t.accuracy,
    };
  };

  const withLiveCurrentSessionStats = (entry: any, topicId: string) => {
    const snap = getTopicRankingSnapshot(topicId);
    if (!snap) return entry;
    const isThisRun =
      entry.isCurrent ||
      entry.builder_session_id === session.id ||
      entry.id === session.id;
    if (!isThisRun) return entry;
    return { ...entry, ...snap, isCurrent: true };
  };

  const renderSessionCards = (topicId: string, topicName: string) => {
    const data = rankingsData[topicId]?.[rankingView];
    
    
    const isGlobalView = rankingView === "global";
    
    // Handle case where data structure is old format (array) or new format (object)
    if (!data) {
      const snap = getTopicRankingSnapshot(topicId);
      const currentSession = {
        id: session.id,
        rank: 1,
        score: snap?.score ?? result.score,
        timestamp: new Date(),
        isCurrent: true,
        correctAnswers: snap?.correctAnswers ?? result.correctAnswers,
        totalQuestions: snap?.totalQuestions ?? result.totalQuestions,
        avgTimeMs: snap?.avgTimeMs ?? result.averageTimeMs,
        accuracy: snap?.accuracy ?? result.accuracy,
        username: "You",
      };
      
      return (
        <div className={cn(mentalMathUi ? "space-y-4" : "space-y-4")}>
          {renderSingleCard(currentSession, isGlobalView, 0, topicName, session.id)}
        </div>
      );
    }

    const displayWindow =
      data.displayWindow ??
      (data.allRankings?.length
        ? buildLeaderboardWindow(data.allRankings, session.id)
        : data.top3?.map((entry: any) => ({ type: "entry" as const, entry })) ?? null);

    if (displayWindow && displayWindow.length > 0) {
      const { currentRank } = data;
      const cards: JSX.Element[] = [];
      let cardIndex = 0;

      displayWindow.forEach((item: { type: string; entry?: any }, windowIdx: number) => {
        if (item.type === "ellipsis") {
          cards.push(
            <div key={`ellipsis-${windowIdx}`} className="flex justify-center py-3">
              <span
                className={cn(
                  "inline-block rotate-90 text-2xl font-bold leading-none",
                  isGlobalView ? "text-primary/30" : "text-text-disabled",
                )}
                aria-hidden
              >
                …
              </span>
            </div>,
          );
          return;
        }

        const sessionData = item.entry;
        const card = renderSingleCard(
          withLiveCurrentSessionStats(sessionData, topicId),
          isGlobalView,
          cardIndex,
          topicName,
          session.id,
        );
        if (card) {
          cards.push(card);
          cardIndex++;
        }
      });

      if (cards.length === 0) {
        // Fallback to showing current attempt
        // IMPORTANT: Use SESSION-LEVEL stats, not topic-level stats
        // This ensures consistency with the top cards
        const snap = getTopicRankingSnapshot(topicId);
        const currentSession = {
          id: session.id,
          rank: currentRank || 1,
          score: snap?.score ?? result.score,
          timestamp: new Date(),
          isCurrent: true,
          correctAnswers: snap?.correctAnswers ?? result.correctAnswers,
          totalQuestions: snap?.totalQuestions ?? result.totalQuestions,
          avgTimeMs: snap?.avgTimeMs ?? result.averageTimeMs,
          accuracy: snap?.accuracy ?? result.accuracy,
          username: "You",
        };
        return (
          <div className="space-y-4">
            {renderSingleCard(
              withLiveCurrentSessionStats(currentSession, topicId),
              isGlobalView,
              0,
              topicName,
              session.id,
            )}
          </div>
        );
      }

      return (
        <div className={cn(mentalMathUi ? "space-y-4" : "space-y-4")}>
          {cards}
        </div>
      );
    }

    // Fallback for old array format (shouldn't happen, but handle gracefully)
    if (Array.isArray(data)) {
      return (
        <div className="space-y-4">
          {data.slice(0, 10).map((sessionData: any, idx: number) =>
            renderSingleCard(
              withLiveCurrentSessionStats(sessionData, topicId),
              isGlobalView,
              idx,
              topicName,
              session.id,
            ),
          )}
        </div>
      );
    }

    return (
      <div className={cn("py-8 text-center text-sm text-text-muted", topicStatsFontClass)}>No attempts yet</div>
    );
  };

  const sessionSubtitle =
    mode === "mental-math"
      ? `Mental math session • ${result.totalQuestions} ${result.totalQuestions === 1 ? "question" : "questions"}`
      : `${mode.replace("-", " ")} session • ${result.totalQuestions} questions`;

  const resultsCard = mentalMathUi
    ? "rounded-organic-lg bg-surface-elevated"
    : "rounded-organic-lg border border-border bg-surface-elevated";

  const scoreOverviewCard = resultsCard;

  const highlightedSessionClass = mentalMathUi
    ? "bg-success"
    : "bg-primary";

  const sessionRowSurface = mentalMathUi
    ? "rounded-organic-lg bg-surface-mid"
    : "rounded-organic-md border border-border-subtle bg-surface-mid";

  return (
    <div className="min-h-screen bg-background">
      <Container size="lg" className="py-10 sm:py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <h1
              className={cn(
                "mb-2 font-heading font-bold tracking-tight text-text",
                mentalMathUi ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
              )}
            >
              Session Complete! 🎉
            </h1>
            <p className="text-sm text-text-muted sm:text-base">{sessionSubtitle}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="shrink-0"
          >
            <Button
              variant={mentalMathUi ? "primary" : "secondary"}
              size="sm"
              onClick={onBackToBuilder}
              className={cn(
                "min-h-[2.875rem] rounded-organic-md px-5 py-3.5 text-sm font-semibold",
                mentalMathUi
                  ? "border-0 shadow-none hover:shadow-none"
                  : "border-border bg-surface-mid text-text shadow-sm hover:bg-surface-neutral",
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {mentalMathUi ? "Back to Home" : "Start new session"}
            </Button>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className={cn("h-full p-6", scoreOverviewCard)}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy
                    className={cn(
                      "h-4 w-4",
                      mentalMathUi ? "text-success" : "text-warning",
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider",
                      mentalMathUi ? "text-success/90" : "text-text-muted",
                    )}
                  >
                    Session score
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScoreInfo(true)}
                  className="rounded-organic-md p-1 text-text-subtle transition-colors hover:bg-surface-subtle hover:text-text"
                  aria-label="How scoring works"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <div
                className={cn(
                  "mb-2 font-bold tabular-nums text-4xl leading-none sm:text-5xl",
                  mentalMathUi ? "text-success" : "text-warning",
                )}
              >
                {result.score}
              </div>
              <div className="text-xs text-text-subtle">Out of 1000 points</div>
              {result.topicBreakdown.length > 1 && (
                <div className="mt-3 text-[10px] leading-snug text-text-subtle">
                  Combined score across {result.topicBreakdown.length} topics; each topic has its own
                  leaderboard score below.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={`h-full p-6 ${resultsCard}`}>
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-text-muted" aria-hidden />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Accuracy
                </div>
              </div>
              <div className="mb-2 text-4xl font-bold tabular-nums leading-none text-text">
                {result.accuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-text-subtle">
                {result.correctAnswers} / {result.totalQuestions}{" "}
                {mentalMathUi ? "attempts correct" : "correct"}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={`h-full p-6 ${resultsCard}`}>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" aria-hidden />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Avg speed
                </div>
              </div>
              <div className="mb-2 text-4xl font-bold tabular-nums leading-none text-text">
                {formatTimeMs(result.averageTimeMs)}
              </div>
              <div className="text-xs text-text-subtle">per question</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`h-full p-6 ${resultsCard}`}>
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-text-muted" aria-hidden />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Fastest
                </div>
              </div>
              <div className="mb-2 text-4xl font-bold tabular-nums leading-none text-text">
                {formatTime(result.fastestTimeMs)}
              </div>
              <div className="text-xs lowercase text-text-subtle">Best performance</div>
            </div>
          </motion.div>
        </div>

        {/* Session Progress Section */}
        {result.progressData && result.progressData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8 w-full"
          >
            <div className={`p-6 ${resultsCard}`}>
              <div className="mb-6">
                <h2 className="mb-1 font-heading text-xl font-bold text-text sm:text-2xl">
                  Session progress
                </h2>
                <p className="text-sm text-text-muted">
                  Accuracy and speed throughout the session
                </p>
              </div>
              <div className="h-[200px] min-h-[180px]">
                <SessionMiniChart data={result.progressData} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Detailed Topic Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className={`p-6 ${resultsCard}`}>
              <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  {!mentalMathUi && (
                    <div className="mb-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                          rankingView === "personal"
                            ? "bg-difficulty-easy text-background"
                            : "bg-secondary/20 text-secondary",
                        )}
                      >
                        {rankingView === "personal" ? "Personal" : "Global"}
                      </span>
                    </div>
                  )}
                  <h2
                    className={cn(
                      "mb-1 text-xl font-bold text-text sm:text-2xl",
                      mentalMathUi ? "font-sans" : "font-heading",
                    )}
                  >
                    Topic breakdown
                  </h2>
                  <p className={cn("text-sm text-text-muted", mentalMathUi && "font-sans")}>
                    Performance by topic area
                  </p>
                </div>

                <div
                  className={cn(
                    "flex shrink-0 gap-1 sm:pt-1",
                    mentalMathUi ? "gap-2" : "border-b border-border-subtle",
                  )}
                  role="tablist"
                  aria-label="Ranking scope"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rankingView === "personal"}
                    onClick={() => setRankingView("personal")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                      mentalMathUi
                        ? rankingView === "personal"
                          ? "rounded-organic-lg bg-primary px-4 py-2 font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] [text-shadow:0_0.5px_1px_rgba(0,0,0,0.2)]"
                          : "rounded-organic-lg bg-surface-mid/50 px-4 py-2 text-text-muted hover:bg-surface-mid hover:text-text"
                        : rankingView === "personal"
                          ? "-mb-px border-b-2 border-primary text-text"
                          : "-mb-px border-b-2 border-transparent text-text-muted hover:text-text",
                    )}
                  >
                    {!mentalMathUi && <User className="h-3.5 w-3.5" aria-hidden />}
                    Personal
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rankingView === "global"}
                    onClick={() => setRankingView("global")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                      mentalMathUi
                        ? rankingView === "global"
                          ? "rounded-organic-lg bg-primary px-4 py-2 font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] [text-shadow:0_0.5px_1px_rgba(0,0,0,0.2)]"
                          : "rounded-organic-lg bg-surface-mid/50 px-4 py-2 text-text-muted hover:bg-surface-mid hover:text-text"
                        : rankingView === "global"
                          ? "-mb-px border-b-2 border-primary text-text"
                          : "-mb-px border-b-2 border-transparent text-text-muted hover:text-text",
                    )}
                  >
                    {!mentalMathUi && <Users className="h-3.5 w-3.5" aria-hidden />}
                    Global
                  </button>
                </div>
              </div>

              <div className={cn(mentalMathUi ? "space-y-12" : "space-y-8")}>
                {rankingView === "global" && !isLoggedIn ? (
                  <div
                    className={cn(
                      "flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8",
                      mentalMathUi
                        ? "rounded-organic-xl bg-surface-mid/20 shadow-sm dark:bg-surface-mid/15"
                        : "rounded-organic-lg bg-surface-subtle",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-bold tracking-tight text-text",
                          mentalMathUi
                            ? "font-sans text-lg sm:text-xl"
                            : "font-heading text-lg sm:text-xl",
                        )}
                      >
                        Sign in to view the global leaderboard
                      </p>
                      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                        Compare your score with other players and save your
                        progress across sessions.
                      </p>
                    </div>
                    <div className="w-full shrink-0 sm:max-w-[17.5rem]">
                      <GoogleAuthButton
                        mode="signin"
                        loading={signInLoading}
                        onClick={() => void handleGoogleSignIn()}
                      />
                    </div>
                  </div>
                ) : (
                  result.topicBreakdown.map((topic, idx) => {
                  const topicName = getDisplayFolderName(topic.topicId);
                  const isGlobalView = rankingView === "global";

                  return (
                    <motion.div
                      key={topic.topicId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className={cn(
                        mentalMathUi &&
                          "rounded-organic-xl bg-surface-mid/20 p-4 shadow-sm sm:p-5 dark:bg-surface-mid/15",
                      )}
                    >
                      {/* Topic Header */}
                      <div className={cn("mb-4", mentalMathUi && "mb-4")}>
                        <div
                          className={cn(
                            "flex flex-wrap items-end justify-between gap-3",
                            mentalMathUi && "gap-4",
                          )}
                        >
                          <h3
                            className={cn(
                              "font-bold capitalize text-text",
                              mentalMathUi
                                ? "font-sans text-lg tracking-tight sm:text-xl"
                                : "mb-1 font-heading text-xl",
                            )}
                          >
                            {topicName}
                          </h3>
                        </div>
                        {mentalMathUi && (
                          <div
                            className={cn(
                              "mb-2 grid items-center gap-x-8 px-6 pb-3 pt-1 font-sans sm:gap-x-12 sm:px-8",
                              isGlobalView
                                ? "grid-cols-[2.5rem_minmax(6.5rem,auto)_minmax(0,1fr)_4.5rem_4.5rem_4.5rem]"
                                : "grid-cols-[2.5rem_minmax(6.5rem,auto)_4.5rem_5rem_4.5rem_minmax(0,1fr)]",
                            )}
                          >
                            <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">Rank</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Score</span>
                            {isGlobalView ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Player</span>
                            ) : null}
                            <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Accuracy</span>
                            {isGlobalView ? (
                              <>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Pace</span>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Correct</span>
                              </>
                            ) : (
                              <>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Correct</span>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Pace</span>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Date</span>
                              </>
                            )}
                          </div>
                        )}
                        {isGlobalView && !mentalMathUi && (
                          <div
                            className={cn(
                              "mt-4 grid grid-cols-12 items-center gap-3 gap-y-2 sm:gap-4",
                              "border-b border-border-subtle pb-2",
                            )}
                          >
                            <div className="col-span-1 text-center">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Rank
                              </span>
                            </div>
                            <div className="col-span-4">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Player
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Score
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Accuracy
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Speed
                              </span>
                            </div>
                            <div className="col-span-1 text-right">
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wide text-text-muted",
                                  mentalMathUi ? "font-sans" : "font-mono",
                                )}
                              >
                                Q&apos;s
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Session Cards List */}
                      {isLoadingRankings ? (
                        <div
                          className={cn(
                            "flex h-32 items-center justify-center rounded-organic-lg",
                            mentalMathUi
                              ? "bg-surface-subtle"
                              : "border border-border-subtle bg-surface-subtle",
                          )}
                        >
                          <div className="flex animate-pulse space-x-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isGlobalView ? "bg-primary/30" : "bg-text-muted/40",
                              )}
                            />
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isGlobalView ? "bg-primary/30" : "bg-text-muted/40",
                              )}
                            />
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isGlobalView ? "bg-primary/30" : "bg-text-muted/40",
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        renderSessionCards(topic.topicId, topicName)
                      )}
                    </motion.div>
                  );
                })
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Score Info Modal */}
        <AnimatePresence>
          {showScoreInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
              onClick={() => setShowScoreInfo(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={cn(
                  "relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
                  !mentalMathUi && "border border-border",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowScoreInfo(false)}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-surface-mid"
                >
                  <X className="h-4 w-4 text-text-muted" />
                </button>

                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-organic-md bg-primary/20">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text">Session score</h3>
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      Out of 1000 points
                    </p>
                  </div>
                </div>

                <div className="space-y-5 text-sm leading-relaxed text-text-muted">
                  <p>
                    The session score summarises your result on a 0–1000 scale. Accuracy is the main factor; session length, drill difficulty, and pace adjust the final value.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 font-medium text-text">Accuracy</div>
                      <p className="text-xs text-text-muted">
                        Based on correct answers out of questions in the session. A single error on a short run reduces the score substantially.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Session length</div>
                      <p className="text-xs text-text-muted">
                        Longer sessions can reach a higher base score. A brief run with every answer correct will still score well below a long, accurate session.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Difficulty</div>
                      <p className="text-xs text-text-muted">
                        Harder drill settings increase the score for the same accuracy and length. Easy modes are scored against a lower ceiling.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Pace</div>
                      <p className="text-xs text-text-muted">
                        A modest bonus applies when your average time per question is fast. It does not outweigh accuracy or session length.
                      </p>
                    </div>
                  </div>

                  <p className="border-t border-border-subtle pt-4 text-xs text-text-muted">
                    Scores in the high 800s and above require long, demanding sessions with strong accuracy. A score of 1000 is uncommon.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </div>
  );
}



