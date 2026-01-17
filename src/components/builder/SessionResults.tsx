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
import { getTopic } from "@/config/topics";
import { calculateSessionScore, fetchTopicRankings } from "@/lib/analytics";
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
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [rankingView, setRankingView] = useState<RankingView>("personal");
  const [rankingsData, setRankingsData] = useState<Record<string, any>>({});
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  const result = useMemo(() => {
    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const times = attempts.map((a) => a.timeSpent || 0);
    const averageTimeMs = times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    const fastestTimeMs = times.length ? Math.min(...times) : 0;
    const slowestTimeMs = times.length ? Math.max(...times) : 0;

    const score = calculateSessionScore(correctAnswers, totalQuestions, averageTimeMs);

    const topicStats: Record<string, { correct: number; total: number; times: number[] }> = {};
    
    // Create a map of questionId -> question for efficient lookup
    const questionMap = new Map(session.questions.map(q => [q.id, q]));

    attempts.forEach((attempt) => {
      const question = questionMap.get(attempt.questionId);
      const topicId = question?.topicId;
      
      if (!topicId) {
        console.error(`[SessionResults] ERROR: Missing topicId for attempt with questionId: ${attempt.questionId}`);
        return; // Skip attempts without valid topicId
      }
      
      if (!topicStats[topicId]) {
        topicStats[topicId] = { correct: 0, total: 0, times: [] };
      }
      topicStats[topicId].total += 1;
      if (attempt.isCorrect) topicStats[topicId].correct += 1;
      topicStats[topicId].times.push(attempt.timeSpent || 0);
    });

    const topicBreakdown = Object.entries(topicStats).map(([topicId, stats]) => {
      // Calculate avgTimeMs consistently with database logic
      const avgTimeMs = stats.times.length
        ? stats.times.reduce((sum, t) => sum + t, 0) / stats.times.length
        : 0;
      
      // Calculate score using the same method as database (matching session-saver.ts)
      const score = calculateSessionScore(stats.correct, stats.total, avgTimeMs);
      
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
  }, [authSession?.user?.id, result.topicBreakdown, session.id, supabase, rankingView]);

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
      // Determine score tier for subtle visual indicator
      const scoreTier = session.score >= 900 ? 'excellent' : session.score >= 750 ? 'great' : session.score >= 600 ? 'good' : 'developing';
      
      return (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className={cn(
            "relative rounded-organic-md p-5 transition-all",
            isHighlighted
              ? "bg-blue-500/10 ring-1 ring-blue-500/20"
              : "bg-white/[0.02] hover:bg-white/[0.04]",
            // Subtle left border accent based on score (very subtle, not busy)
            scoreTier === 'excellent' && "border-l-2 border-blue-500/30",
            scoreTier === 'great' && "border-l-2 border-blue-400/20",
            scoreTier === 'good' && "border-l-2 border-blue-300/15",
            scoreTier === 'developing' && "border-l-2 border-white/5"
          )}
        >
          {/* Content Grid */}
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Rank */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="text-lg font-bold tabular-nums font-mono text-blue-400">
                {session.rank}
              </div>
            </div>

            {/* Avatar + Name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
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
                        parent.innerHTML = `<span class="text-xs font-medium text-white/70">${getInitials(session.username)}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs font-medium text-white/70">
                    {getInitials(session.username)}
                  </span>
                )}
              </div>
              <span className="text-sm text-white/80 font-medium truncate">
                {session.username}
              </span>
            </div>

            {/* Score */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                  {session.score}
                </div>
                <div className="text-xs text-white/40 font-mono">/ 1000</div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className={cn(
                  "text-base font-bold font-mono",
                  "text-blue-400"
                )}>
                  {session.accuracy.toFixed(0)}%
                </div>
                <div className="text-xs text-white/40 font-mono">accuracy</div>
              </div>
            </div>

            {/* Speed */}
            <div className="col-span-2 flex items-center justify-end">
              <div className="text-right">
                <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                  {formatTimeMs(session.avgTimeMs)}
                </div>
                <div className="text-xs text-white/40 font-mono">per question</div>
              </div>
            </div>

            {/* Questions */}
            <div className="col-span-1 flex items-center justify-end">
              <div className="text-right">
                <div className="text-sm font-semibold text-white/80 tabular-nums font-mono">
                  {session.correctAnswers}/{session.totalQuestions}
                </div>
                <div className="text-xs text-white/40 font-mono">correct</div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // For personal view, keep the original layout
    return (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.03 }}
        className={cn(
          "rounded-organic-md p-3 transition-all",
          isHighlighted
            ? "bg-primary/10 ring-1 ring-primary/20"
            : "bg-white/[0.02] hover:bg-white/[0.04]"
        )}
      >
        <div className="flex items-center gap-6">
          {/* Rank Number - Leftmost */}
          <div className="flex-shrink-0">
            <div className="text-lg font-bold tabular-nums font-mono text-primary">
              {session.rank}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Score and Topic Row */}
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="text-xl font-bold text-white/90 tabular-nums font-mono">
                  {session.score}
                </span>
                <span className="text-sm text-white/40 font-mono">/ 1000</span>
                <span className="text-xs text-white/30 font-mono truncate">
                  {topicName}
                </span>
              </div>
              <span className="text-xs text-white/40 font-mono flex-shrink-0">
                {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>

          {/* Right Side Stats */}
          <div className="flex-shrink-0 text-right">
            <div className="space-y-1">
              <div className="text-xs font-mono text-white/70">
                {formatTimeMs(session.avgTimeMs)} <span className="text-white/40">/ q</span>
              </div>
              <div className="text-xs font-mono text-white/70">
                {session.correctAnswers}/{session.totalQuestions} <span className="text-white/40">correct</span>
              </div>
              <div className="text-xs font-mono font-bold text-primary">
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
      const currentTopic = result.topicBreakdown.find(t => t.topicId === topicId);
      if (currentTopic) {
        const currentSession = {
          id: session.id,
          rank: 1,
          score: currentTopic.score,
          timestamp: new Date(),
          isCurrent: true,
          correctAnswers: currentTopic.correct,
          totalQuestions: currentTopic.total,
          avgTimeMs: currentTopic.avgTimeMs,
          accuracy: currentTopic.accuracy,
          username: "You",
        };
        
        return (
          <div className="space-y-4">
            {renderSingleCard(currentSession, isGlobalView, 0, topicName, session.id)}
          </div>
        );
      }
      
      return (
        <div className="text-center py-8 text-white/40 font-mono text-sm">
          No attempts yet
        </div>
      );
    }

    // New structured format: { top3, currentRank, adjacent, allRankings }
    const structuredData = data.top3 ? data : null;
    
    if (structuredData) {
      const { top3, currentRank, adjacent } = structuredData;
      const cards: any[] = [];
      let cardIndex = 0;
      const topCount = isGlobalView ? 10 : 3; // 10 for global (to show multiple per person), 3 for personal

      // Show top N (10 for global, 3 for personal)
      top3.forEach((sessionData: any) => {
        const card = renderSingleCard(sessionData, isGlobalView, cardIndex, topicName, session.id);
        if (card) {
          cards.push(card);
          cardIndex++;
        }
      });

      // If current is not in top N (for personal view only), show ellipsis and adjacent
      if (!isGlobalView && currentRank !== null && currentRank > topCount && adjacent.length > 0) {
        cards.push(
          <div key="ellipsis" className="flex justify-center py-2">
            <span className={cn(
              "text-2xl font-bold",
              isGlobalView ? "text-blue-500/30" : "text-white/20"
            )}>...</span>
          </div>
        );
        
        adjacent.forEach((sessionData: any) => {
          const card = renderSingleCard(sessionData, isGlobalView, cardIndex, topicName, session.id);
          if (card) {
            cards.push(card);
            cardIndex++;
          }
        });
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
        const currentTopic = result.topicBreakdown.find(t => t.topicId === topicId);
        if (currentTopic) {
          const currentSession = {
            id: session.id,
            rank: currentRank || 1,
            score: currentTopic.score,
            timestamp: new Date(),
            isCurrent: true,
            correctAnswers: currentTopic.correct,
            totalQuestions: currentTopic.total,
            avgTimeMs: currentTopic.avgTimeMs,
            accuracy: currentTopic.accuracy,
            username: "You",
          };
          return (
            <div className="space-y-3">
              {renderSingleCard(currentSession, isGlobalView, 0, topicName, session.id)}
            </div>
          );
        }
        return (
          <div className="text-center py-8 text-white/40 font-mono text-sm">
            No attempts yet
          </div>
        );
      }

      return (
        <div className="space-y-4">
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
        <div className="space-y-4">
          {data.slice(0, 10).map((sessionData: any, idx: number) => 
            renderSingleCard(sessionData, isGlobalView, idx, topicName, session.id)
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-white/40 font-mono text-sm">
        No attempts yet
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Container size="lg" className="py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-heading font-bold text-white/90 mb-2">
              Session Complete! 🎉
            </h1>
            <p className="text-white/50 font-mono text-sm uppercase tracking-wider">
              {mode.replace("-", " ")} Session • {result.totalQuestions} Questions
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Button
              variant="secondary"
              size="md"
              onClick={onBackToBuilder}
              className="rounded-organic-md border-white/10 bg-white/5 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </motion.div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div className="text-sm text-white/50 font-mono uppercase tracking-tight">Session Score</div>
                </div>
                <button 
                  onClick={() => setShowScoreInfo(true)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <div className="text-5xl font-bold text-white/90 tabular-nums leading-none mb-2">
                {result.score}
              </div>
              <div className="text-xs text-white/40 font-mono">Out of 1000 points</div>
            </div>
          </motion.div>

          {/* Accuracy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-white/60" />
                <div className="text-sm text-white/50 font-mono uppercase tracking-tight">Accuracy</div>
              </div>
              <div className="text-4xl font-bold text-white/90 tabular-nums leading-none mb-2">
                {result.accuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-white/40 font-mono">
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
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-white/60" />
                <div className="text-sm text-white/50 font-mono uppercase tracking-tight">Avg Speed</div>
              </div>
              <div className="text-4xl font-bold text-white/90 tabular-nums leading-none mb-2">
                {formatTimeMs(result.averageTimeMs)}
              </div>
              <div className="text-xs text-white/40 font-mono">per question</div>
            </div>
          </motion.div>

          {/* Fastest Time Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-white/60" />
                <div className="text-sm text-white/50 font-mono uppercase tracking-tight">Fastest</div>
              </div>
              <div className="text-4xl font-bold text-white/90 tabular-nums leading-none mb-2 text-interview">
                {formatTime(result.fastestTimeMs)}
              </div>
              <div className="text-xs text-white/40 font-mono">best performance</div>
            </div>
          </motion.div>
        </div>

        {/* Session Progress Section */}
        {result.progressData && result.progressData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="w-full"
          >
            <div className="p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="mb-6">
                <h2 className="text-2xl font-heading font-bold text-white/90 mb-1">
                  Session Progress
                </h2>
                <p className="text-sm text-white/50 font-mono">
                  Accuracy and speed throughout the session
                </p>
              </div>
              <div className="h-[200px]">
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
            <div className="p-6 rounded-organic-lg bg-white/[0.02]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-white/90 mb-1">
                    Topic Breakdown
                  </h2>
                  <p className="text-sm text-white/50 font-mono">
                    Performance by topic area
                  </p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setRankingView("personal")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all",
                      rankingView === "personal" ? "bg-primary/20 text-primary" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <User className="h-3 w-3" />
                    Personal
                  </button>
                  <button
                    onClick={() => setRankingView("global")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all",
                      rankingView === "global" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    Global
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {result.topicBreakdown.map((topic, idx) => {
                  const topicInfo = getTopic(topic.topicId);
                  if (!topicInfo) {
                    console.warn(`[SessionResults] Topic not found for topicId: ${topic.topicId}`);
                  }
                  const topicName = topicInfo?.name || topic.topicId;
                  const isGlobalView = rankingView === "global";

                  return (
                    <motion.div
                      key={topic.topicId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                    >
                      {/* Topic Header */}
                      <div className="mb-6">
                        <h3 className="text-xl font-heading font-bold text-white/90 mb-1">
                          {topicName}
                        </h3>
                        {isGlobalView && (
                          <div className="grid grid-cols-12 gap-4 items-center mt-4 pb-2 border-b border-white/5">
                            <div className="col-span-1 text-center">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Rank</span>
                            </div>
                            <div className="col-span-4">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Player</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Score</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Accuracy</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Speed</span>
                            </div>
                            <div className="col-span-1 text-right">
                              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Q's</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Session Cards List */}
                      {isLoadingRankings ? (
                        <div className="h-32 flex items-center justify-center bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="animate-pulse flex space-x-2">
                            <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
                            <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
                            <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
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
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowScoreInfo(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-background border border-white/10 rounded-organic-lg p-8 max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowScoreInfo(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4 text-white/40" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-organic-md bg-primary/20 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-white/90">How Score works</h3>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-wider">The Agresti-Coull Method</p>
                  </div>
                </div>

                <div className="space-y-6 text-sm text-white/70 leading-relaxed">
                  <p>
                    Your session score (0-1000) is calculated based on three weighted factors:
                  </p>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="font-mono text-primary font-bold">50%</div>
                      <div>
                        <div className="text-white/90 font-medium mb-1">Adjusted Accuracy</div>
                        <p className="text-xs text-white/50">
                          We use the Agresti-Coull (plus-four) adjustment which rewards consistency and ensures reliable scoring even for short sessions.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="font-mono text-primary font-bold">30%</div>
                      <div>
                        <div className="text-white/90 font-medium mb-1">Speed Score</div>
                        <p className="text-xs text-white/50">
                          Based on your average time per question. Scores higher as you approach the 3-second mastery baseline.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="font-mono text-primary font-bold">20%</div>
                      <div>
                        <div className="text-white/90 font-medium mb-1">Volume Multiplier</div>
                        <p className="text-xs text-white/50">
                          A small bonus for completing more questions in a single session, scaling logarithmically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-white/40 italic">
                      Note: The accuracy percentage shown on your summary is your raw score. The score uses the adjusted method to prevent "lucky" short streaks from dominating the rankings.
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



