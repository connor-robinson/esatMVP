"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FermiDistributionChart } from "@/components/fermi/FermiDistributionChart";
import {
  FermiTrendChart,
  type FermiTrendPoint,
} from "@/components/fermi/FermiTrendChart";
import {
  FERMI_GUESSR_NAME,
  FERMI_GUESSR_PLAY_PATH,
  FERMI_GUESSR_STATS_PATH,
} from "@/config/fermiGuessr";
import { cn } from "@/lib/utils";

type DistributionPoint = { score: number; density: number };

type StatsResponse = {
  sessions: FermiTrendPoint[];
  focus: {
    playedDate: string;
    puzzleNumber: number | null;
    playerCount: number;
    averageScore: number | null;
    percentile: number | null;
    populationMean: number;
    distribution: DistributionPoint[];
  };
};

export default function FermiGuessrStatsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(FERMI_GUESSR_STATS_PATH)}`,
    [],
  );

  const loadStats = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = date ? `/api/fermi/stats?date=${encodeURIComponent(date)}` : "/api/fermi/stats";
      const res = await fetch(url);
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      if (!res.ok) throw new Error("Failed to load stats");
      const data = (await res.json()) as StatsResponse;
      setStats(data);
      setSelectedDate(data.focus.playedDate);
    } catch {
      setError(`Could not load your ${FERMI_GUESSR_NAME} stats. Try again in a moment.`);
    } finally {
      setLoading(false);
    }
  }, [loginHref, router]);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    void loadStats();
  }, [session?.user, loadStats]);

  const trendDirection = useMemo(() => {
    if (!stats || stats.sessions.length < 2) return null;
    const recent = stats.sessions.slice(-3);
    const first = recent[0].averageScore;
    const last = recent[recent.length - 1].averageScore;
    const delta = last - first;
    if (delta >= 8) return { label: "Improving", tone: "text-primary" };
    if (delta <= -8) return { label: "Cooling off", tone: "text-warning" };
    return { label: "Steady", tone: "text-text-muted" };
  }, [stats]);

  if (!session?.user) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-organic-xl bg-secondary/20 text-secondary">
            <BarChart3 className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-text">{FERMI_GUESSR_NAME} stats</h1>
          <p className="mt-2 text-sm font-medium text-text-muted">
            You must be logged in to view your percentile ranking and score history.
          </p>
          <button
            type="button"
            onClick={() => router.push(loginHref)}
            className="mt-6 rounded-organic-lg bg-secondary px-6 py-3 text-sm font-bold text-white outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Log in to continue
          </button>
          <button
            type="button"
            onClick={() => router.push(FERMI_GUESSR_PLAY_PATH)}
            className="mt-4 block w-full text-sm font-semibold text-text-muted outline-none hover:text-text"
          >
            Back to {FERMI_GUESSR_NAME}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background py-6 sm:py-8">
      <Container size="md">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(FERMI_GUESSR_PLAY_PATH)}
            className="flex h-10 w-10 items-center justify-center rounded-organic-lg bg-surface text-text-muted outline-none transition-colors hover:bg-surface-mid hover:text-text"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{FERMI_GUESSR_NAME} stats</h1>
            <p className="text-sm font-medium text-text-muted">
              Percentile ranking and your score trend
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-organic-xl bg-surface p-6 text-center text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <div className="flex flex-col gap-6">
            <section className="rounded-organic-xl bg-surface p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {stats.focus.puzzleNumber != null
                      ? `${FERMI_GUESSR_NAME} #${stats.focus.puzzleNumber}`
                      : "Today's puzzle"}
                  </h2>
                  <p className="text-sm font-medium text-text-muted">
                    {stats.focus.playedDate}
                    {stats.focus.playerCount > 0 &&
                      ` · ${stats.focus.playerCount} player${stats.focus.playerCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                {stats.focus.averageScore != null && (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-secondary">
                      {stats.focus.averageScore}
                      <span className="text-lg font-semibold text-text-muted">/100</span>
                    </p>
                    {stats.focus.percentile != null && (
                      <p className="text-sm font-semibold text-text-muted">
                        Beat {stats.focus.percentile}% of players
                      </p>
                    )}
                  </div>
                )}
              </div>

              <FermiDistributionChart
                curve={stats.focus.distribution}
                userScore={stats.focus.averageScore}
                percentile={stats.focus.percentile}
              />

              {stats.sessions.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stats.sessions.map((s) => (
                    <button
                      key={s.playedDate}
                      type="button"
                      onClick={() => {
                        setSelectedDate(s.playedDate);
                        void loadStats(s.playedDate);
                      }}
                      className={cn(
                        "rounded-organic-md px-3 py-1.5 text-xs font-semibold outline-none transition-colors",
                        selectedDate === s.playedDate
                          ? "bg-secondary/20 text-secondary"
                          : "bg-surface-mid text-text-muted hover:text-text",
                      )}
                    >
                      {s.playedDate}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">Score trend</h2>
                {trendDirection && (
                  <span className={cn("text-sm font-semibold", trendDirection.tone)}>
                    {trendDirection.label}
                  </span>
                )}
              </div>
              <FermiTrendChart sessions={stats.sessions} />
            </section>
          </div>
        )}
      </Container>
    </div>
  );
}
