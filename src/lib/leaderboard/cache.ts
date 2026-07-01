import type { LeaderboardEntry } from "@/types/analytics";

export const leaderboardCache = new Map<string, LeaderboardEntry[]>();

export function clearLeaderboardCache() {
  leaderboardCache.clear();
}
