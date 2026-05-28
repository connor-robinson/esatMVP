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
  SESSION_FALLBACK_TOPIC_ID,
} from "@/lib/analytics";
import {
  resolveDisplayFolderForTopic,
  getDisplayFolderName,
} from "@/lib/display-folder-registry";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
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
  const mentalMathUi = mode === "mental-math";
  /** Topic breakdown + leaderboard rows: Space Grotesk for drill, mono elsewhere */
  const topicStatsFontClass = mentalMathUi ? "font-sans tabular-nums tracking-tight" : "font-mono";
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [rankingView, setRankingView] = useState<RankingView>("personal");
  const [rankingsData, setRankingsData] = useState<Record<string, any>>({});
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  // CENTRAL CALCULATION: All session-level stats calculated here from attempts
  // This ensures consistency across all displays (top cards, highlighted cards, etc.)
  const result = useMemo(() => {
    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const times = attempts.map((a) => a.timeSpent || 0);
    const averageTimeMs = times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    const fastestTimeMs = times.length ? Math.min(...times) : 0;
    const slowestTimeMs = times.length ? Math.max(...times) : 0;

    const sessionDifficulties: number[] = [];

    const topicStats: Record<
      string,
      { correct: number; total: number; times: number[]; difficulties: number[] }
    > = {};
    
    // Create a map of questionId -> question for efficient lookup
    const questionMap = new Map(session.questions.map(q => [q.id, q]));

    attempts.forEach((attempt) => {
      const question = questionMap.get(attempt.questionId);
      const rawTopicId =
        question?.topicId?.trim() || SESSION_FALLBACK_TOPIC_ID;
      const { folderId: topicId } = resolveDisplayFolderForTopic(rawTopicId);

      const difficulty = question?.difficulty ?? 2;
      sessionDifficulties.push(difficulty);

      if (!topicStats[topicId]) {
        topicStats[topicId] = { correct: 0, total: 0, times: [], difficulties: [] };
      }
      topicStats[topicId].total += 1;
      if (attempt.isCorrect) topicStats[topicId].correct += 1;
      topicStats[topicId].times.push(attempt.timeSpent || 0);
      topicStats[topicId].difficulties.push(difficulty);
    });

    const sessionAvgDifficulty = averageQuestionDifficulty(sessionDifficulties);
    const score = calculateSessionScore(correctAnswers, totalQuestions, averageTimeMs, {
      avgDifficulty: sessionAvgDifficulty,
    });

    const topicBreakdown = Object.entries(topicStats).map(([topicId, stats]) => {
      // Calculate avgTimeMs consistently with database logic
      const avgTimeMs = stats.times.length
        ? stats.times.reduce((sum, t) => sum + t, 0) / stats.times.length
        : 0;
      const avgDifficulty = averageQuestionDifficulty(stats.difficulties);
      const score = calculateSessionScore(stats.correct, stats.total, avgTimeMs, {
        avgDifficulty,
      });
      
      return {
        topicId,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total ? (stats.correct / stats.total) * 100 : 0,
        avgTimeMs,
        score,
      };
    });

    // Generate progress data for the session chart
    const progressData: SessionProgressPoint[] = [];
    let runningCorrect = 0;
    
    attempts.forEach((attempt, index) => {
      const questionNumber = index + 1;
      if (attempt.isCorrect) runningCorrect += 1;
      
      // Running accuracy up to this point
      const runningAccuracy = questionNumber > 0 ? (runningCorrect / questionNumber) * 100 : 0;
      
      // Speed in questions per minute (convert ms to minutes)
      const timeSpentMs = attempt.timeSpent || 0;
      const speed = timeSpentMs > 0 ? (60000 / timeSpentMs) : 0; // questions per minute
      
      progressData.push({
        questionNumber,
        accuracy: runningAccuracy,
        speed,
      });
    });

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
  }, [attempts, session]);

  // Load rankings data for each topic - refetch when session changes
  useEffect(() => {
    if (result.topicBreakdown.length === 0) return;

    const loadAllRankings = async () => {
      setIsLoadingRankings(true);
      const newRankings: Record<string, any> = {};
      const userId = authSession?.user?.id || "anonymous";
      
      console.log("[SessionResults] DEBUG: Loading rankings", {
        topics: result.topicBreakdown.map(t => t.topicId),
        userId,
        sessionId: session.id,
        topicCount: result.topicBreakdown.length,
      });
      
      // Expose debug function to window for console access
      (window as any).debugDrillSessions = async (topicId?: string) => {
        const topicsToCheck = topicId ? [topicId] : result.topicBreakdown.map(t => t.topicId);
        
        for (const tid of topicsToCheck) {
          console.log(`\n=== Debugging topic: ${tid} ===`);
          
          // Check all sessions for this topic
          const { data: allSessions, error } = await supabase
            .from("drill_sessions")
            .select("id, user_id, topic_id, summary, completed_at, created_at, accuracy, average_time_ms, question_count")
            .eq("topic_id", tid)
            .order("created_at", { ascending: false })
            .limit(100);
          
          if (error) {
            console.error(`Error fetching sessions for ${tid}:`, error);
          } else {
            console.log(`Found ${allSessions?.length || 0} total sessions for topic ${tid}`);
            console.log("Sample sessions:", allSessions?.slice(0, 5));
          }
          
          // Check personal sessions if logged in
          if (userId !== "anonymous") {
            const { data: personalSessions } = await supabase
              .from("drill_sessions")
              .select("id, summary, completed_at")
              .eq("user_id", userId)
              .eq("topic_id", tid)
              .order("created_at", { ascending: false });
            
            console.log(`Found ${personalSessions?.length || 0} personal sessions for user ${userId}`);
          }
        }
      };
      
      for (const topic of result.topicBreakdown) {
        try {
          // Log the exact values being passed to ensure consistency
          console.log(`[SessionResults] DEBUG: Fetching rankings for topic ${topic.topicId}`, {
            topicId: topic.topicId,
            score: topic.score,
            correctAnswers: topic.correct,
            totalQuestions: topic.total,
            avgTimeMs: topic.avgTimeMs,
            accuracy: topic.accuracy,
          });
          
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
          
          console.log(`[SessionResults] DEBUG: Rankings loaded for ${topic.topicId}`, {
            personalCount: rankings.personal?.allRankings?.length || 0,
            globalCount: rankings.global?.allRankings?.length || 0,
            personalCurrentRank: rankings.personal?.currentRank,
            globalCurrentRank: rankings.global?.currentRank,
            personalTop3Count: rankings.personal?.top3?.length || 0,
            globalTop3Count: rankings.global?.top3?.length || 0,
          });
          
          newRankings[topic.topicId] = rankings;
        } catch (error) {
          console.error(`[SessionResults] ERROR: Failed to load rankings for ${topic.topicId}:`, {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            topicId: topic.topicId,
          });
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
      console.error('[renderSingleCard] Invalid session data:', session);
      return null;
    }
    
    // Only highlight if it's the current session (matches the session.id we're viewing)
    // Check if builder_session_id matches currentSessionId, or if isCurrent flag is set and IDs match
    const isHighlighted = currentSessionId && (
      session.builder_session_id === currentSessionId ||
      (session.isCurrent && session.id === currentSessionId)
    );

    // For global view, use column-based layout
    if (isGlobalView) {
      const scorePercentage = (session.score / 1000) * 100;
      const showProgressBar = session.rank <= 3 || isHighlighted;

      if (mentalMathUi) {
        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={cn(
              "relative overflow-hidden rounded-organic-lg px-4 py-3.5 transition-colors sm:px-5 sm:py-4",
              isHighlighted ? highlightedSessionClass : "bg-surface-mid hover:bg-surface-neutral/60",
            )}
          >
            {showProgressBar && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-border-subtle/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scorePercentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.05 }}
                  className="h-full bg-success/45"
                />
              </div>
            )}
            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  "w-8 shrink-0 text-center text-sm font-bold tabular-nums",
                  isHighlighted ? "text-success" : "text-text-muted",
                  topicStatsFontClass,
                )}
              >
                {session.rank}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-mid">
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
                          parent.innerHTML = `<span class="text-xs font-medium text-text-muted">${getInitials(session.username)}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-text-muted">
                      {getInitials(session.username)}
                    </span>
                  )}
                </div>
                <span className="truncate text-sm font-medium text-text">{session.username}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn("text-2xl font-bold tabular-nums leading-none text-text", topicStatsFontClass)}>
                  {session.score}
                </div>
                <div className={cn("mt-0.5 text-[11px] text-text-muted", topicStatsFontClass)}>
                  {session.accuracy.toFixed(0)}% · {session.correctAnswers}/{session.totalQuestions}
                </div>
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
          {/* Progress Bar - Only for top 3 or current attempt */}
          {showProgressBar && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-border-subtle">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scorePercentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.05 }}
                className="h-full bg-primary/40"
              />
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-12 gap-4 items-center relative z-10">
            {/* Rank */}
            <div className="col-span-1 flex items-center justify-center">
              <div className={cn("text-lg font-bold tabular-nums text-primary", topicStatsFontClass)}>
                {session.rank}
              </div>
            </div>

            {/* Avatar + Name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-mid">
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
                        parent.innerHTML = `<span class="text-xs font-medium text-text-muted">${getInitials(session.username)}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs font-medium text-text-muted">
                    {getInitials(session.username)}
                  </span>
                )}
              </div>
              <span className="truncate text-sm font-medium text-text">
                {session.username}
              </span>
            </div>

            {/* Score */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums text-text", topicStatsFontClass)}>
                  {session.score}
                </div>
                <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>
                  / {mentalMathUi ? 999 : 1000}
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div
                  className={cn(
                    "text-base font-bold",
                    "text-primary",
                    topicStatsFontClass,
                  )}
                >
                  {session.accuracy.toFixed(0)}%
                </div>
                <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>accuracy</div>
              </div>
            </div>

            {/* Speed */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-base font-bold tabular-nums text-text", topicStatsFontClass)}>
                  {formatTimeMs(session.avgTimeMs)}
                </div>
                <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>per question</div>
              </div>
            </div>

            {/* Questions */}
            <div className="col-span-1 flex items-center justify-end">
              <div className="text-right">
                <div className={cn("text-sm font-semibold tabular-nums text-text", topicStatsFontClass)}>
                  {session.correctAnswers}/{session.totalQuestions}
                </div>
                <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>correct</div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // For personal view, keep the original layout
    if (mentalMathUi) {
      return (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className={cn(
            "rounded-organic-lg px-4 py-3.5 transition-colors sm:px-5 sm:py-4",
            isHighlighted ? highlightedSessionClass : "bg-surface-mid hover:bg-surface-neutral/60",
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-9 shrink-0 text-center text-sm font-bold tabular-nums",
                isHighlighted ? "text-success" : "text-text-muted",
                topicStatsFontClass,
              )}
            >
              {session.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-3xl font-bold tabular-nums leading-none text-text", topicStatsFontClass)}>
                {session.score}
              </div>
              <div className={cn("mt-1 text-xs text-text-muted", topicStatsFontClass)}>
                / {mentalMathUi ? 999 : 1000}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn("text-lg font-bold tabular-nums text-success", topicStatsFontClass)}>
                {session.accuracy.toFixed(0)}%
              </div>
              <div className={cn("mt-0.5 text-xs text-text-muted", topicStatsFontClass)}>
                {session.correctAnswers}/{session.totalQuestions} correct
              </div>
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
          "transition-colors",
          mentalMathUi ? "p-4 sm:p-5" : "p-3",
          isHighlighted
            ? highlightedSessionClass
            : "hover:bg-surface-neutral/60",
        )}
      >
        <div className="flex items-center gap-6">
          {/* Rank Number - Leftmost */}
          <div className="flex-shrink-0">
            <div className={cn("text-lg font-bold tabular-nums text-primary", topicStatsFontClass)}>
              {session.rank}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Score and Topic Row */}
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className={cn("text-xl font-bold tabular-nums text-text", topicStatsFontClass)}>
                  {session.score}
                </span>
                <span className={cn("text-sm text-text-muted", topicStatsFontClass)}>
                  / {mentalMathUi ? 999 : 1000}
                </span>
                <span className={cn("truncate text-xs text-text-subtle", topicStatsFontClass)}>
                  {topicName}
                </span>
              </div>
              <span className={cn("flex-shrink-0 text-xs text-text-muted", topicStatsFontClass)}>
                {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>

          {/* Right Side Stats */}
          <div className="flex-shrink-0 text-right">
            <div className="space-y-1">
              <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>
                {formatTimeMs(session.avgTimeMs)} <span className="text-text-subtle">/ q</span>
              </div>
              <div className={cn("text-xs text-text-muted", topicStatsFontClass)}>
                {session.correctAnswers}/{session.totalQuestions}{" "}
                <span className="text-text-subtle">correct</span>
              </div>
              <div className={cn("text-xs font-bold text-primary", topicStatsFontClass)}>
                {session.accuracy.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSessionCards = (topicId: string, topicName: string) => {
    const data = rankingsData[topicId]?.[rankingView];
    
    console.log(`[renderSessionCards] DEBUG: Rendering cards`, {
      topicId,
      topicName,
      view: rankingView,
      hasData: !!data,
      dataStructure: data ? {
        hasTop3: !!data.top3,
        top3Count: data.top3?.length || 0,
        currentRank: data.currentRank,
        adjacentCount: data.adjacent?.length || 0,
        allRankingsCount: data.allRankings?.length || 0,
      } : null,
      currentSessionId: session.id,
    });
    
    const isGlobalView = rankingView === "global";
    
    // Handle case where data structure is old format (array) or new format (object)
    if (!data) {
      // Fallback: show current attempt if no data
      // IMPORTANT: Use SESSION-LEVEL stats, not topic-level stats
      // This ensures consistency with the top cards
      const currentSession = {
        id: session.id,
        rank: 1,
        score: result.score, // Session-level score
        timestamp: new Date(),
        isCurrent: true,
        correctAnswers: result.correctAnswers, // Session-level correct
        totalQuestions: result.totalQuestions, // Session-level total
        avgTimeMs: result.averageTimeMs, // Session-level avg time
        accuracy: result.accuracy, // Session-level accuracy
        username: "You",
      };
      
      return (
        <div className={cn("space-y-4", mentalMathUi && "space-y-3")}>
          {renderSingleCard(currentSession, isGlobalView, 0, topicName, session.id)}
        </div>
      );
    }

    // New structured format: { top3, currentRank, adjacent, allRankings }
    const structuredData = data.top3 ? data : null;
    
    if (structuredData) {
      const { top3, currentRank, adjacent } = structuredData;
      const cards: any[] = [];
      let cardIndex = 0;
      const topCount = isGlobalView ? 5 : 3; // 5 for global (top 5 leaderboard), 3 for personal

      // Show top N (5 for global, 3 for personal)
      const topEntries = isGlobalView ? top3.slice(0, 5) : top3.slice(0, 3);
      topEntries.forEach((sessionData: any) => {
        const card = renderSingleCard(sessionData, isGlobalView, cardIndex, topicName, session.id);
        if (card) {
          cards.push(card);
          cardIndex++;
        }
      });

      // Check if current attempt is in top entries
      const currentInTop = topEntries.some((entry: any) => 
        entry.isCurrent || (session.id && (entry.builder_session_id === session.id || entry.id === session.id))
      );

      // If current is not in top N, show ellipsis and current attempt
      if (currentRank !== null && currentRank > topCount && !currentInTop) {
        // Find current attempt in adjacent or create from session data
        const currentAttempt = adjacent.find((entry: any) => 
          entry.isCurrent || (session.id && (entry.builder_session_id === session.id || entry.id === session.id))
        ) || {
          id: session.id,
          rank: currentRank,
          score: result.score,
          timestamp: new Date(),
          isCurrent: true,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          avgTimeMs: result.averageTimeMs,
          accuracy: result.accuracy,
          username: "You",
        };

        if (currentAttempt) {
          cards.push(
            <div key="ellipsis" className="flex justify-center py-2">
              <span
                className={cn(
                  "text-2xl font-bold",
                  isGlobalView ? "text-primary/30" : "text-text-disabled",
                )}
              >
                ...
              </span>
            </div>
          );
          
          const card = renderSingleCard(currentAttempt, isGlobalView, cardIndex, topicName, session.id);
          if (card) {
            cards.push(card);
            cardIndex++;
          }
        }
      }

      if (cards.length === 0) {
        console.warn('[renderSessionCards] WARNING: No cards to render despite having structuredData', {
          topicId,
          view: rankingView,
          structuredData: {
            top3Count: structuredData.top3?.length || 0,
            currentRank: structuredData.currentRank,
            adjacentCount: structuredData.adjacent?.length || 0,
          },
        });
        // Fallback to showing current attempt
        // IMPORTANT: Use SESSION-LEVEL stats, not topic-level stats
        // This ensures consistency with the top cards
        const currentSession = {
          id: session.id,
          rank: currentRank || 1,
          score: result.score, // Session-level score
          timestamp: new Date(),
          isCurrent: true,
          correctAnswers: result.correctAnswers, // Session-level correct
          totalQuestions: result.totalQuestions, // Session-level total
          avgTimeMs: result.averageTimeMs, // Session-level avg time
          accuracy: result.accuracy, // Session-level accuracy
          username: "You",
        };
        return (
          <div className={cn("space-y-4", mentalMathUi && "space-y-3")}>
            {renderSingleCard(currentSession, isGlobalView, 0, topicName, session.id)}
          </div>
        );
      }

      return (
        <div className={cn("space-y-4", mentalMathUi && "space-y-3")}>
          {cards}
        </div>
      );
    }

    // Fallback for old array format (shouldn't happen, but handle gracefully)
    if (Array.isArray(data)) {
      console.warn("[renderSessionCards] WARNING: Received old array format, converting...", {
        topicId,
        view: rankingView,
        arrayLength: data.length,
      });
      return (
        <div className={cn("space-y-4", mentalMathUi && "space-y-3")}>
          {data.slice(0, 10).map((sessionData: any, idx: number) => 
            renderSingleCard(sessionData, isGlobalView, idx, topicName, session.id)
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

  const highlightedSessionClass = mentalMathUi
    ? "bg-success/10 ring-[3px] ring-success"
    : "bg-primary/10 ring-1 ring-primary/20";

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
              variant="secondary"
              size="sm"
              onClick={onBackToBuilder}
              className={cn(
                "rounded-organic-md px-4 py-2 text-sm font-semibold text-text",
                mentalMathUi
                  ? "border-0 bg-surface-mid shadow-none hover:bg-surface-neutral focus-visible:ring-success/35"
                  : "border-border bg-surface-mid shadow-sm hover:bg-surface-neutral",
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start new session
            </Button>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className={`h-full p-6 ${resultsCard}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" aria-hidden />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
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
              <div className="mb-2 font-bold tabular-nums text-4xl leading-none text-warning sm:text-5xl">
                {result.score}
              </div>
              <div className="text-xs text-text-subtle">
                {mentalMathUi ? "Max 999 points" : "Out of 1000 points"}
              </div>
              {result.topicBreakdown.length > 1 && (
                <div className="mt-3 text-[10px] leading-snug text-text-subtle">
                  Combined score across {result.topicBreakdown.length} topics; each topic has its own
                  leaderboard score below.
                </div>
              )}
            </div>
          </motion.div>

          {/* Accuracy Card */}
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
                {result.correctAnswers} / {result.totalQuestions} correct
              </div>
            </div>
          </motion.div>

          {/* Avg Time Card */}
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

          {/* Fastest Time Card */}
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
                          ? "rounded-organic-lg bg-primary px-4 py-2 font-bold text-background shadow-[0_2px_6px_rgba(0,0,0,0.2)] [text-shadow:0_0.5px_1px_rgba(0,0,0,0.2)]"
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
                          ? "rounded-organic-lg bg-primary px-4 py-2 font-bold text-background shadow-[0_2px_6px_rgba(0,0,0,0.2)] [text-shadow:0_0.5px_1px_rgba(0,0,0,0.2)]"
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

              <div className={cn(mentalMathUi ? "space-y-10" : "space-y-8")}>
                {result.topicBreakdown.map((topic, idx) => {
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
                          {mentalMathUi && (
                            <div className="text-right">
                              <div
                                className={cn(
                                  "text-3xl font-bold tabular-nums leading-none text-text",
                                  topicStatsFontClass,
                                )}
                              >
                                {topic.score}
                              </div>
                              <div
                                className={cn(
                                  "mt-1 text-xs text-text-muted",
                                  topicStatsFontClass,
                                )}
                              >
                                {topic.accuracy.toFixed(0)}% · {topic.correct}/{topic.total}
                              </div>
                            </div>
                          )}
                        </div>
                        {isGlobalView && !mentalMathUi && (
                          <div
                            className={cn(
                              "mt-4 grid grid-cols-12 items-center gap-3 gap-y-2 sm:gap-4",
                              mentalMathUi
                                ? "rounded-organic-lg bg-surface-subtle/80 px-3 py-3 sm:px-4"
                                : "border-b border-border-subtle pb-2",
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
                })}
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
                className="relative w-full max-w-md rounded-organic-xl border border-border bg-surface-elevated p-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
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
                    <h3 className="font-heading text-xl font-bold text-text">How score works</h3>
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      Up to 999 session points
                    </p>
                  </div>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-text-muted">
                  <p>
                    Your score reflects how many you got right, how many you attempted, how hard the drills were, and (lightly) how fast you were.
                  </p>

                  <div className={cn("space-y-4", mentalMathUi && "space-y-3")}>
                    <div>
                      <div className="mb-1 font-medium text-text">Accuracy</div>
                      <p className="text-xs text-text-muted">
                        Correct ÷ total questions. One mistake on a short run lowers the score noticeably.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Volume</div>
                      <p className="text-xs text-text-muted">
                        Short sessions are capped: you need a long run (about 28+ questions) for full volume credit. A single correct answer cannot score hundreds of points.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Difficulty</div>
                      <p className="text-xs text-text-muted">
                        Easy modes score lower than hard modes for the same accuracy. Harder drill variants raise your multiplier.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 font-medium text-text">Speed</div>
                      <p className="text-xs text-text-muted">
                        A small bonus if your average time per question is quick (around 3 seconds or less).
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs italic text-text-muted">
                      The accuracy % on your summary is plain right ÷ attempted. ~900 is an excellent score; 1000 is not achievable — only approaches 999 on elite long, hard, accurate runs.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </div>
  );
}



