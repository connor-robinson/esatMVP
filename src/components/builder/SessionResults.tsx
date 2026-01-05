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
  ChevronRight, 
  Users, 
  User, 
  TrendingUp,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

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

    attempts.forEach((attempt, index) => {
      const topicId = session.questions[index]?.topicId ?? "unknown";
      if (!topicStats[topicId]) {
        topicStats[topicId] = { correct: 0, total: 0, times: [] };
      }
      topicStats[topicId].total += 1;
      if (attempt.isCorrect) topicStats[topicId].correct += 1;
      topicStats[topicId].times.push(attempt.timeSpent || 0);
    });

    const topicBreakdown = Object.entries(topicStats).map(([topicId, stats]) => ({
      topicId,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total ? (stats.correct / stats.total) * 100 : 0,
      avgTimeMs: stats.times.length
        ? stats.times.reduce((sum, t) => sum + t, 0) / stats.times.length
        : 0,
      score: calculateSessionScore(stats.correct, stats.total, stats.times.reduce((sum, t) => sum + t, 0) / stats.times.length)
    }));

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
    };
  }, [attempts, session]);

  // Load rankings data for each topic
  useEffect(() => {
    if (!authSession?.user?.id || result.topicBreakdown.length === 0) return;

    const loadAllRankings = async () => {
      setIsLoadingRankings(true);
      const newRankings: Record<string, any> = {};
      
      for (const topic of result.topicBreakdown) {
        const rankings = await fetchTopicRankings(
          supabase,
          topic.topicId,
          authSession.user.id,
          session.id,
          topic.score
        );
        newRankings[topic.topicId] = rankings;
      }
      
      setRankingsData(newRankings);
      setIsLoadingRankings(false);
    };

    loadAllRankings();
  }, [authSession?.user?.id, result.topicBreakdown, session.id, supabase]);

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const renderRankingList = (topicId: string) => {
    const data = rankingsData[topicId]?.[rankingView];
    if (!data) return null;

    const isGlobalView = rankingView === "global";
    const { top3, hasGap, adjacent } = data.top3 ? data : { top3: data, hasGap: false, adjacent: [] };

    return (
      <div className="mt-4 space-y-2">
        {top3.map((r: any) => (
          <div 
            key={r.id} 
            className={cn(
              "flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all border",
              r.isCurrent 
                ? (isGlobalView ? "bg-blue-500/20 border-blue-400/30 ring-1 ring-blue-500/20" : "bg-primary/20 border-primary/30 ring-1 ring-primary/20")
                : "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-5 h-5 flex items-center justify-center rounded-full font-bold",
                r.rank === 1 ? "bg-yellow-500/20 text-yellow-500" : 
                r.rank === 2 ? "bg-slate-300/20 text-slate-300" :
                r.rank === 3 ? "bg-amber-600/20 text-amber-600" : (isGlobalView ? "text-blue-400/40" : "text-white/40")
              )}>
                {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
              </span>
              <span className={cn(r.isCurrent ? "text-white font-bold" : (isGlobalView ? "text-blue-100/70" : "text-white/70"))}>
                {r.username}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/40">{new Date(r.timestamp).toLocaleDateString()}</span>
              <span className={cn("font-bold", isGlobalView ? "text-blue-400" : "text-primary")}>{r.score}</span>
            </div>
          </div>
        ))}

        {hasGap && (
          <div className="flex justify-center py-1">
            <MoreHorizontal className={cn("h-4 w-4", isGlobalView ? "text-blue-500/20" : "text-white/20")} />
          </div>
        )}

        {adjacent && adjacent.filter((r: any) => r.rank > 3).map((r: any) => (
          <div 
            key={r.id} 
            className={cn(
              "flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all border",
              r.isCurrent 
                ? (isGlobalView ? "bg-blue-500/20 border-blue-400/30 ring-1 ring-blue-500/20" : "bg-primary/20 border-primary/30 ring-1 ring-primary/20")
                : "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("w-5 h-5 flex items-center justify-center", isGlobalView ? "text-blue-400/40" : "text-white/40")}>
                {r.rank}
              </span>
              <span className={cn(r.isCurrent ? "text-white font-bold" : (isGlobalView ? "text-blue-100/70" : "text-white/70"))}>
                {r.username}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/40">{new Date(r.timestamp).toLocaleDateString()}</span>
              <span className={cn("font-bold", isGlobalView ? "text-blue-400" : "text-primary")}>{r.score}</span>
            </div>
          </div>
        ))}
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
            <div className="h-full p-6 rounded-organic-lg bg-primary/10 border border-primary/20 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-organic-md bg-primary/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <button 
                    onClick={() => setShowScoreInfo(true)}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-white/50 font-mono mb-1 uppercase tracking-tight">Session Score</div>
                <div className="text-5xl font-bold text-white/90 tabular-nums leading-none mb-2">
                  {result.score}
                </div>
                <div className="text-xs text-white/40 font-mono">Out of 1000 points</div>
              </div>
              {/* Background Glow */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-all duration-700" />
            </div>
          </motion.div>

          {/* Accuracy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center mb-4 text-white/60">
                <Target className="h-5 w-5" />
              </div>
              <div className="text-sm text-white/50 font-mono mb-1 uppercase tracking-tight">Accuracy</div>
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
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center mb-4 text-white/60">
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-sm text-white/50 font-mono mb-1 uppercase tracking-tight">Avg Speed</div>
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
            <div className="h-full p-6 rounded-organic-lg bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center mb-4 text-white/60">
                <Zap className="h-5 w-5" />
              </div>
              <div className="text-sm text-white/50 font-mono mb-1 uppercase tracking-tight">Fastest</div>
              <div className="text-4xl font-bold text-white/90 tabular-nums leading-none mb-2 text-interview">
                {formatTime(result.fastestTimeMs)}
              </div>
              <div className="text-xs text-white/40 font-mono">best performance</div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Detailed Topic Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="p-6 rounded-organic-lg bg-white/[0.02] border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-xl font-heading font-semibold text-white/90 flex items-center gap-2">
                  Topic Breakdown
                  <span className="text-xs font-mono text-white/30 font-normal px-2 py-0.5 rounded-full border border-white/10 ml-2">
                    {result.topicBreakdown.length} Topics
                  </span>
                </h2>

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

              <div className="space-y-6">
                {result.topicBreakdown.map((topic, idx) => {
                  const topicInfo = getTopic(topic.topicId);
                  const topicName = topicInfo?.name || topic.topicId;
                  const isGlobalView = rankingView === "global";

                  return (
                    <motion.div
                      key={topic.topicId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      className={cn(
                        "p-5 rounded-organic-lg border transition-all duration-300",
                        isGlobalView 
                          ? "bg-blue-500/[0.02] border-blue-500/10 hover:border-blue-500/20" 
                          : "bg-white/[0.03] border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isGlobalView ? "bg-blue-400/60" : "bg-primary/60"
                              )} />
                              <span className="font-medium text-white/90 text-lg">{topicName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-mono">
                              <span className="text-white/40">
                                {topic.correct}/{topic.total} Correct
                              </span>
                              <span className={cn(
                                "px-2 py-1 rounded bg-white/5 font-bold",
                                topic.accuracy >= 80 ? "text-interview" : isGlobalView ? "text-blue-400" : "text-primary"
                              )}>
                                {topic.accuracy.toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-8 mb-6">
                            <div>
                              <div className="text-[10px] text-white/30 uppercase font-mono mb-2 tracking-widest">Accuracy</div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${topic.accuracy}%` }}
                                  transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    topic.accuracy >= 80 ? "bg-interview" : isGlobalView ? "bg-blue-500" : "bg-primary"
                                  )}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-white/30 uppercase font-mono mb-2 tracking-widest">Average Speed</div>
                              <div className="text-sm font-mono text-white/70">
                                {formatTimeMs(topic.avgTimeMs)} <span className="text-white/30 text-xs">/ q</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ranking Breakdown */}
                      <div className={cn(
                        "pt-4 border-t",
                        isGlobalView ? "border-blue-500/10" : "border-white/5"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={cn(
                            "text-[10px] uppercase font-mono tracking-widest flex items-center gap-2",
                            isGlobalView ? "text-blue-400/50" : "text-white/30"
                          )}>
                            {isGlobalView ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {isGlobalView ? "Global Leaderboard" : "Best Attempts"}
                          </h4>
                        </div>
                        
                        {isLoadingRankings ? (
                          <div className="h-20 flex items-center justify-center bg-white/[0.02] rounded-lg">
                            <div className="animate-pulse flex space-x-2">
                              <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
                              <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
                              <div className={cn("h-2 w-2 rounded-full", isGlobalView ? "bg-blue-500/20" : "bg-white/20")}></div>
                            </div>
                          </div>
                        ) : (
                          renderRankingList(topic.topicId)
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Insights or Actions */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-organic-lg bg-white/[0.02] border border-white/10 flex flex-col items-center text-center py-10"
            >
              <div className="w-16 h-16 rounded-organic-lg bg-white/5 flex items-center justify-center mb-6">
                <ChevronRight className="h-8 w-8 text-white/40" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white/90 mb-2">Ready for more?</h3>
              <p className="text-white/50 text-sm mb-8 leading-relaxed max-w-[200px]">
                Target your weak areas or increase the difficulty to keep improving.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={onBackToBuilder}
                className="w-full rounded-organic-md shadow-lg"
              >
                Continue Training
              </Button>
            </motion.div>

            {/* Quick Tips Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="p-6 rounded-organic-lg border border-white/5 bg-white/[0.01]"
            >
              <h4 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">Pro Tip</h4>
              <div className="flex gap-3">
                <div className="mt-1">
                  <TrendingUp className="h-4 w-4 text-interview" />
                </div>
                <p className="text-white/60 text-xs leading-relaxed font-mono italic">
                  &quot;Accuracy is more important than speed in early training. Focus on getting it right, and the speed will follow naturally.&quot;
                </p>
              </div>
            </motion.div>
          </div>
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



