/**
 * Leaderboard page - Global rankings (signed-in users only)
 */

"use client";

import { useEffect, useState, Suspense, lazy, useRef } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import type {
  TimeRange,
  LeaderboardEntry,
} from "@/types/analytics";
import { calculateLeaderboardScore } from "@/lib/analytics";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPublicDisplayName } from "@/lib/profile/publicDisplayName";
import { leaderboardCache } from "@/lib/leaderboard/cache";
import {
  getAnalyticsFolderOptions,
  topicIdsForFolderQuery,
} from "@/lib/display-folder-registry";
import { Trophy } from "lucide-react";

const GlobalView = lazy(() =>
  import("@/components/analytics/GlobalView").then((mod) => ({ default: mod.GlobalView })),
);

const AVAILABLE_TOPICS = getAnalyticsFolderOptions();

async function fetchLeaderboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<LeaderboardEntry[]> {
  // Build query without profile join (fetch profiles separately)
  let query = supabase
    .from("topic_progress")
    .select("user_id, topic_id, questions_correct, questions_attempted, average_time_ms");

  if (topicId && topicId !== "all") {
    query = query.in("topic_id", topicIdsForFolderQuery(topicId));
  }

  // OPTIMIZED: enough rows for ~1000+ users across topics (was 300)
  const { data, error } = await query.limit(8000);

  if (error) {
    return [];
  }

  // Get unique user IDs and fetch profiles separately
  const userIds = [...new Set((data as any[])?.map((row: any) => row.user_id) || [])];
  const profilesMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    const CHUNK = 80;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const slice = userIds.slice(i, i + CHUNK);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", slice);

      if (profilesError && profilesError.code === "42P01") {
        break;
      }
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap.set(profile.id, getPublicDisplayName(profile));
        });
      }
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

function sortAndRank(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export default function LeaderboardPage() {
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setLeaderboardData([]);
      return;
    }

    const cacheKey = `${session.user.id}:${selectedTopic}`;
    const cached = leaderboardCache.get(cacheKey);
    if (cached) {
      setLeaderboardData(cached);
      setLeaderboardLoading(false);
    } else {
      setLeaderboardLoading(true);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const run = async () => {
        if (leaderboardCache.has(cacheKey)) {
          setLeaderboardData(leaderboardCache.get(cacheKey)!);
          setLeaderboardLoading(false);
          return;
        }
        setLeaderboardLoading(true);
        try {
          const entries = await fetchLeaderboard(
            supabase,
            session.user!.id,
            selectedTopic,
          );
          const sorted = sortAndRank(entries);
          leaderboardCache.set(cacheKey, sorted);
          setLeaderboardData(sorted);
        } finally {
          setLeaderboardLoading(false);
        }
      };
      void run();
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [session?.user, supabase, selectedTopic]);

  if (!session?.user) {
    const loginHref = `/login?redirectTo=${encodeURIComponent("/mental-maths/leaderboard")}`;
    return (
      <div className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-organic-xl bg-primary/20 text-primary">
            <Trophy className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-text">Leaderboard</h1>
          <p className="mt-2 text-sm font-medium text-text-muted">
            You must be signed in to view drill rankings.
          </p>
          <button
            type="button"
            onClick={() => router.push(loginHref)}
            className="mt-6 rounded-organic-lg bg-primary px-6 py-3 text-sm font-bold text-black outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in to continue
          </button>
          <button
            type="button"
            onClick={() => router.push("/mental-maths/drill")}
            className="mt-4 block w-full text-sm font-semibold text-text-muted outline-none hover:text-text"
          >
            Back to drills
          </button>
        </div>
      </div>
    );
  }

  return (
    <Container size="lg" className="space-y-8 py-10 sm:py-12">
      {leaderboardLoading && leaderboardData.length === 0 && (
        <div className="h-12 rounded-lg bg-surface-elevated animate-pulse" />
      )}
      <Suspense fallback={<div className="h-96 bg-surface-elevated rounded-lg animate-pulse" />}>
        <GlobalView
          leaderboardData={leaderboardData}
          currentUserId={session.user.id}
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






