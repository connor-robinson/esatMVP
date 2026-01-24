/**
 * Leaderboard page - Global rankings
 */

"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { Container } from "@/components/layout/Container";
import type {
  TimeRange,
  LeaderboardEntry,
} from "@/types/analytics";
import { calculateLeaderboardScore } from "@/lib/analytics";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { TOPICS } from "@/config/topics";

const GlobalView = lazy(() =>
  import("@/components/analytics/GlobalView").then((mod) => ({ default: mod.GlobalView })),
);

// Get all available topics from config
const AVAILABLE_TOPICS = Object.values(TOPICS).map(topic => ({
  id: topic.id,
  name: topic.name,
}));

async function fetchLeaderboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<LeaderboardEntry[]> {
  // Build query without profile join (fetch profiles separately)
  let query = supabase
    .from("topic_progress")
    .select("user_id, topic_id, questions_correct, questions_attempted, average_time_ms");

  // Filter by topic if specified
  if (topicId && topicId !== "all") {
    query = query.eq("topic_id", topicId);
  }

  // OPTIMIZED: Reduced from 500 to 300 for egress optimization (top 300 leaderboard entries)
  const { data, error } = await query.limit(300);

  if (error) {
    console.error("[leaderboard] failed to load leaderboard base", error);
    return [];
  }

  // Get unique user IDs and fetch profiles separately
  const userIds = [...new Set((data as any[])?.map((row: any) => row.user_id) || [])];
  const profilesMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap.set(profile.id, profile.display_name || "Anonymous User");
      });
    }
  }

  const grouped = new Map<
    string,
    { userId: string; displayName: string; correct: number; attempted: number; avgTime: number; topics: number }
  >();

  (data as any[])?.forEach((row) => {
    const displayName = profilesMap.get(row.user_id) || "Anonymous User";
    const entry = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      displayName: row.user_id === userId ? "You" : displayName,
      correct: 0,
      attempted: 0,
      avgTime: 0,
      topics: 0,
    };

    entry.correct += row.questions_correct;
    entry.attempted += row.questions_attempted;
    entry.avgTime += row.average_time_ms;
    entry.topics += 1;

    grouped.set(row.user_id, entry);
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const avgTime = entry.topics ? entry.avgTime / entry.topics : 0;
      const totalTime = entry.attempted * avgTime;
      return {
        userId: entry.userId,
        username: entry.displayName,
        score: calculateLeaderboardScore({
          userId: entry.userId,
          totalQuestions: entry.attempted,
          correctAnswers: entry.correct,
          totalTime: totalTime,
          sessionCount: entry.topics,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          topicStats: {},
          createdAt: new Date(),
        }),
        questionsAnswered: entry.attempted,
        accuracy: entry.attempted ? (entry.correct / entry.attempted) * 100 : 0,
        avgSpeed: avgTime,
        rank: 0,
      };
    })
    .filter((entry) => entry.questionsAnswered > 0); // Only show users with activity
}

export default function LeaderboardPage() {
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

  // Load leaderboard (reacts to topic changes)
  useEffect(() => {
    if (!session?.user) {
      setLeaderboardData([]);
      return;
    }

    fetchLeaderboard(supabase, session.user.id, selectedTopic).then((entries) => {
      const sorted = entries
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      setLeaderboardData(sorted);
    });
  }, [session?.user, supabase, selectedTopic]);

  return (
    <Container size="lg" className="py-10 space-y-8">
      <Suspense fallback={<div className="h-96 bg-white/5 rounded-lg animate-pulse" />}>
        <GlobalView
          leaderboardData={leaderboardData}
          currentUserId={session?.user?.id || ""}
          availableTopics={AVAILABLE_TOPICS}
          selectedTopic={selectedTopic}
          onTopicChange={setSelectedTopic}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </Suspense>
    </Container>
  );
}




