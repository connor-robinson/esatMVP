/**
 * Topics Overview - Brief summary of strongest and weakest topics
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getTopicExtremes } from "@/lib/analytics";
import { getTopic } from "@/config/topics";
import type { UserStats } from "@/types/analytics";
import type { Database, TopicProgressRow } from "@/lib/supabase/types";

async function fetchTopicProgress(
  supabase: any,
  userId: string,
): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from("topic_progress")
    .select("topic_id, current_level, questions_attempted, questions_correct, average_time_ms, last_practiced")
    .eq("user_id", userId);

  if (error) {
    console.error("[topics-overview] failed to load topic progress", error);
    return null;
  }

  // Get actual session counts per topic from drill_sessions
  const { data: drillSessionsData } = await supabase
    .from("drill_sessions")
    .select("topic_id")
    .eq("user_id", userId);

  // Count sessions per topic
  const sessionCountsByTopic = new Map<string, number>();
  if (drillSessionsData) {
    drillSessionsData.forEach((ds: any) => {
      if (ds.topic_id) {
        sessionCountsByTopic.set(ds.topic_id, (sessionCountsByTopic.get(ds.topic_id) || 0) + 1);
      }
    });
  }

  const topicStats: UserStats["topicStats"] = {};
  let totalQuestions = 0;
  let correctAnswers = 0;
  let totalTime = 0;
  let sessionCount = 0;
  let lastPractice: Date | null = null;

  (data as TopicProgressRow[])?.forEach((row) => {
    const topicId = row.topic_id;
    const questionsAnswered = row.questions_attempted;
    const correct = row.questions_correct;
    const avgTime = row.average_time_ms;
    const lastPracticed = row.last_practiced ? new Date(row.last_practiced) : null;
    const topicSessionCount = sessionCountsByTopic.get(topicId) || 0;

    // Map topic ID to proper name from TOPICS config
    const topic = getTopic(topicId);
    const topicName = topic?.name || topicId;

    topicStats[topicId] = {
      topicId,
      topicName,
      questionsAnswered,
      correctAnswers: correct,
      accuracy: questionsAnswered > 0 ? (correct / questionsAnswered) * 100 : 0,
      avgSpeed: avgTime,
      bestSpeed: avgTime,
      totalTime: questionsAnswered * avgTime,
      sessionCount: topicSessionCount,
      rank: row.current_level ?? 0,
      lastPracticed,
    };

    totalQuestions += questionsAnswered;
    correctAnswers += correct;
    totalTime += questionsAnswered * avgTime;
    sessionCount += topicSessionCount;

    if (lastPracticed && (!lastPractice || lastPracticed > lastPractice)) {
      lastPractice = lastPracticed;
    }
  });

  return {
    userId,
    totalQuestions,
    correctAnswers,
    totalTime,
    sessionCount,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: lastPractice,
    topicStats,
    createdAt: lastPractice ?? new Date(),
  };
}

export function TopicsOverview() {
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setUserStats(null);
      setLoading(false);
      return;
    }

    fetchTopicProgress(supabase, session.user.id).then((stats) => {
      setUserStats(stats);
      setLoading(false);
    });
  }, [session?.user, supabase]);

  const topicExtremes = useMemo(() => {
    if (!userStats) return { strongest: [], weakest: [] };
    return getTopicExtremes(userStats);
  }, [userStats]);

  const strongest = topicExtremes.strongest;
  const weakest = topicExtremes.weakest;

  if (loading) {
    return (
      <Card variant="flat" className="p-5">
        <div className="mb-4">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-1" />
          <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-16 bg-white/5 rounded-organic-md animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (!userStats || (strongest.length === 0 && weakest.length === 0)) {
    return (
      <Card variant="flat" className="p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white/90 mb-1">
            Topics Overview
          </h3>
          <p className="text-xs text-white/50">
            Your strongest and weakest areas
          </p>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-white/50 mb-1">
            Start practicing to see insights
          </p>
          <p className="text-xs text-white/30">
            Complete at least 10 questions per topic
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="flat" className="p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white/90 mb-1">
          Topics Overview
        </h3>
        <p className="text-xs text-white/50">
          Your strongest and weakest areas
        </p>
      </div>

      <div className="space-y-4">
        {/* Strongest Topics */}
        {strongest.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Strongest
              </span>
            </div>
            <div className="space-y-2">
              {strongest.map((topic) => (
                <div
                  key={topic.topicId}
                  className="group relative overflow-hidden rounded-organic-md bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm font-medium text-white/95 leading-tight">
                        {topic.topicName}
                      </span>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        {topic.accuracy.toFixed(0)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-white/40">
                      {topic.questionsAnswered} questions practiced
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weakest Topics */}
        {weakest.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-red-400/60 rounded-full" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Needs Practice
              </span>
            </div>
            <div className="space-y-2">
              {weakest.map((topic) => (
                <div
                  key={topic.topicId}
                  className="group relative overflow-hidden rounded-organic-md bg-white/[0.02] border border-white/[0.05] hover:border-red-400/20 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm font-medium text-white/95 leading-tight">
                        {topic.topicName}
                      </span>
                      <span className="text-sm font-bold text-red-400 whitespace-nowrap">
                        {topic.accuracy.toFixed(0)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400/60 transition-all duration-300"
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-white/40">
                      {topic.questionsAnswered} questions practiced
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

