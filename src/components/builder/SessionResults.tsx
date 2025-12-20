/**
 * Session results component with per-topic breakdown
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BuilderSession, QuestionAttempt } from "@/types/core";
import { getTopic } from "@/config/topics";
import { ArrowLeft, Clock, Target, Zap } from "lucide-react";

interface SessionResultsProps {
  session: BuilderSession;
  attempts: QuestionAttempt[];
  onBackToBuilder: () => void;
}

export function SessionResults({ session, attempts, onBackToBuilder }: SessionResultsProps) {
  const result = useMemo(() => {
    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const times = attempts.map((a) => a.timeSpent || 0);
    const averageTimeMs = times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    const fastestTimeMs = times.length ? Math.min(...times) : 0;
    const slowestTimeMs = times.length ? Math.max(...times) : 0;

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
    }));

    return {
      session,
      totalQuestions,
      correctAnswers,
      accuracy,
      averageTimeMs,
      fastestTimeMs,
      slowestTimeMs,
      topicBreakdown,
    };
  }, [attempts, session]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Container size="lg" className="py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-heading font-bold text-white/90 mb-2">
              Session Complete! 🎉
            </h1>
            <p className="text-white/60">
              Here&apos;s how you performed
            </p>
          </motion.div>
        </div>

        {/* Overall stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-8 mb-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-sm text-white/60">Accuracy</span>
                </div>
                <div className="text-4xl font-bold text-white/90">
                  {result.accuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-white/50 mt-1">
                  {result.correctAnswers} / {result.totalQuestions} correct
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm text-white/60">Avg. Time</span>
                </div>
                <div className="text-4xl font-bold text-white/90">
                  {formatTime(result.averageTimeMs)}
                </div>
                <div className="text-sm text-white/50 mt-1">
                  per question
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm text-white/60">Fastest</span>
                </div>
                <div className="text-4xl font-bold text-white/90">
                  {formatTime(result.fastestTimeMs)}
                </div>
                <div className="text-sm text-white/50 mt-1">
                  best time
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Per-topic breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-white/90 mb-4">
              Performance by Topic
            </h2>

            <div className="space-y-4">
              {result.topicBreakdown.map((topic) => {
                const topicInfo = getTopic(topic.topicId);
                const topicName = topicInfo?.name || topic.topicId;

                return (
                  <div
                    key={topic.topicId}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white/90">{topicName}</span>
                      <span className="text-sm text-white/60">
                        {topic.correct} / {topic.total} correct
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all"
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{topic.accuracy.toFixed(1)}% accuracy</span>
                      <span>Avg: {formatTime(topic.avgTimeMs)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Action button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={onBackToBuilder}
            className="min-w-[250px]"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Builder
          </Button>
        </motion.div>
      </Container>
    </div>
  );
}



