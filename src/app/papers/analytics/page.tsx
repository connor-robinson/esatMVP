/**
 * Papers Analytics page - Detailed analytics for paper performance
 */

"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { AnalyticsTrendChart } from "@/components/papers/AnalyticsTrendChart";
import { FileText, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PaperType, PaperSection } from "@/types/papers";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchUserSessions, 
  filterSessions, 
  calculateTrendDataWithPercentiles,
  calculateSessionAnalytics,
  extractYearFromVariant,
  calculatePercentileFromPaperDistribution,
  calculateSectionPerformance,
  calculateTimeManagementInsights
} from "@/lib/papers/analytics";
import type { PaperSession } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getPaperTypeColor, PAPER_TYPE_COLORS, desaturateColor } from "@/config/colors";
import { cn } from "@/lib/utils";

export default function PapersAnalyticsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPaper, setSelectedPaper] = useState<PaperType | "ALL">("ALL");
  const [selectedSection, setSelectedSection] = useState<PaperSection | "ALL">("ALL");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "all">("all");
  const [sessionSortBy, setSessionSortBy] = useState<"recent" | "percentage" | "percentile">("recent");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Fetch sessions on mount
  useEffect(() => {
    if (session?.user) {
      fetchUserSessions().then(data => {
        setSessions(data);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [session]);

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    return filterSessions(sessions, {
      paperType: selectedPaper,
      section: selectedSection,
      timeRange,
    });
  }, [sessions, selectedPaper, selectedSection, timeRange]);

  // Calculate trend data with percentiles
  const trendDataWithPercentiles = useMemo(() => {
    return calculateTrendDataWithPercentiles(sessions);
  }, [sessions]);

  // Convert percentile data to format expected by chart (we'll update the chart to use percentile instead of percentage)
  const trendDataForChart = useMemo(() => {
    return trendDataWithPercentiles.map(d => ({
      date: d.date,
      percentage: d.percentile, // Chart will display this as percentile
      paperType: d.paperType,
      section: d.section,
    }));
  }, [trendDataWithPercentiles]);

  // Calculate analytics
  const analytics = useMemo(() => {
    return calculateSessionAnalytics(filteredSessions);
  }, [filteredSessions]);

  // Get all unique sections practiced
  const sectionsPracticed = useMemo(() => {
    const sections = new Set<PaperSection>();
    filteredSessions.forEach(s => {
      s.selectedSections?.forEach(sec => sections.add(sec));
    });
    return sections.size;
  }, [filteredSessions]);

  // Calculate percentiles for filtered sessions for display
  const sessionsWithPercentiles = useMemo(() => {
    // Group scores by paper type
    const scoresByPaper = new Map<PaperType, number[]>();
    filteredSessions.filter(s => s.score).forEach(session => {
      const paperType = session.paperName;
      const scorePercentage = session.score ? (session.score.correct / session.score.total) * 100 : 0;
      if (!scoresByPaper.has(paperType)) {
        scoresByPaper.set(paperType, []);
      }
      scoresByPaper.get(paperType)!.push(scorePercentage);
    });

    return filteredSessions.map(session => {
      const scorePercentage = session.score ? (session.score.correct / session.score.total) * 100 : null;
      const allScoresForPaper = scoresByPaper.get(session.paperName) || [];
      const percentile = scorePercentage !== null 
        ? calculatePercentileFromPaperDistribution(scorePercentage, allScoresForPaper)
        : null;
      return { ...session, percentile, scorePercentage };
    });
  }, [filteredSessions]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...sessionsWithPercentiles];
    if (sessionSortBy === "recent") {
      sorted.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    } else if (sessionSortBy === "percentage") {
      sorted.sort((a, b) => (b.scorePercentage || 0) - (a.scorePercentage || 0));
    } else if (sessionSortBy === "percentile") {
      sorted.sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
    }
    return sorted;
  }, [sessionsWithPercentiles, sessionSortBy]);

  // Show only first 5 sessions in scrollable view
  const visibleSessions = useMemo(() => {
    return sortedSessions.slice(0, 5);
  }, [sortedSessions]);

  // Calculate section performance with trends
  const sectionPerformance = useMemo(() => {
    return calculateSectionPerformance(filteredSessions);
  }, [filteredSessions]);

  // Calculate time management insights
  const timeManagementInsights = useMemo(() => {
    return calculateTimeManagementInsights(filteredSessions);
  }, [filteredSessions]);

  const { loadSessionFromDatabase } = usePaperSessionStore();

  // Function to load session and navigate to mark page
  const handleViewMarkPage = async (sessionId: string) => {
    try {
      await loadSessionFromDatabase(sessionId);
      router.push('/papers/mark');
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Container size="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="md" />
        </div>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container size="lg">
        <PageHeader
          title="Papers Analytics"
          description="Please log in to view your paper analytics."
        />
      </Container>
    );
  }

  return (
    <Container size="lg">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Papers Analytics"
          description="Deep insights into your paper performance. Track progress, identify patterns, and optimize your preparation."
        />

        {/* 1. Overview Section with Performance Summary */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("overview")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Quick Overview
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">Your performance at a glance</p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("overview") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("overview") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Average Score</div>
                    <div className="text-3xl font-bold text-white/95 leading-none">{Math.round(analytics.averageScore)}%</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Sessions Completed</div>
                    <div className="text-3xl font-bold text-white/95 leading-none">{analytics.totalSessions}</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Avg Time</div>
                    <div className="text-3xl font-bold text-white/95 leading-none">{Math.round(analytics.averageTime)} min</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Sections Practiced</div>
                    <div className="text-3xl font-bold text-white/95 leading-none">{sectionsPracticed}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Performance Chart with Percentiles */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("performance")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Performance Trends
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">
                Track your percentile progression over time
              </p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("performance") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("performance") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {trendDataForChart.length > 0 ? (
                  <AnalyticsTrendChart
                    allSessions={trendDataForChart}
                    filterMode="all"
                    selectedFilters={[]}
                  />
                ) : (
                  <div className="h-64 bg-white/5 rounded-organic-md border border-white/10 flex items-center justify-center">
                    <div className="text-center text-neutral-500">
                      <div className="text-sm">No trend data available</div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Session History - Scrollable with 5 visible */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90">
                Session History
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Your past paper sessions
              </p>
            </div>
            <div className="relative">
              <select
                value={sessionSortBy}
                onChange={(e) => setSessionSortBy(e.target.value as "recent" | "percentage" | "percentile")}
                className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                style={{ colorScheme: "dark" }}
              >
                <option value="recent" className="bg-neutral-800 text-white">Sort by Recent</option>
                <option value="percentage" className="bg-neutral-800 text-white">Sort by Percentage</option>
                <option value="percentile" className="bg-neutral-800 text-white">Sort by Percentile</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
            </div>
            <button
              onClick={() => toggleSection("sessions")}
              className="p-2 rounded-organic-md hover:bg-white/5 transition-colors group"
            >
              <ChevronDown 
                className={cn(
                  "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                  collapsedSections.has("sessions") && "rotate-180"
                )}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("sessions") && (
              <motion.div
                initial={{ maxHeight: 0, opacity: 0 }}
                animate={{ maxHeight: 2000, opacity: 1 }}
                exit={{ maxHeight: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                {visibleSessions.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {visibleSessions.map((session) => {
                      const scorePercentage = session.scorePercentage;
                      const percentile = session.percentile;
                      const date = session.startedAt 
                        ? new Date(session.startedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : 'Unknown date';
                      const minutes = Math.round(session.timeLimitMinutes);
                      
                      // Extract year from variant
                      const year = extractYearFromVariant(session.paperVariant);
                      const variantWithoutYear = year 
                        ? session.paperVariant.replace(/\s*\d{4}\s*/, '').trim()
                        : session.paperVariant;
                      
                      // Main title: Paper name + year
                      const mainTitle = year 
                        ? `${session.paperName} ${year}`
                        : `${session.paperName} ${session.paperVariant}`;
                      
                      // Section info
                      const sectionInfo = session.selectedSections && session.selectedSections.length > 0
                        ? session.selectedSections.join(", ")
                        : variantWithoutYear || session.sessionName;
                      
                      // Icon color based on paper type
                      const iconColor = getPaperTypeColor(session.paperName);

                      // Get ESAT/TMUA score if applicable
                      const paperScore = session.paperName === "ESAT" || session.paperName === "TMUA" 
                        ? scorePercentage !== null ? `${Math.round(scorePercentage)}%` : "N/A"
                        : null;

                      return (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between p-5 bg-white/5 rounded-organic-md hover:bg-white/10 transition-colors"
                        >
                          {/* Left: Icon */}
                          <div className="flex-shrink-0 mr-4">
                            <div 
                              className="w-10 h-10 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: desaturateColor(iconColor, 0.3) }}
                            >
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                          </div>

                          {/* Middle: Session Info */}
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="font-medium text-neutral-100 mb-1">
                              {mainTitle}
                            </div>
                            <div className="text-xs text-neutral-400 mb-1">
                              {sectionInfo}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {date}
                            </div>
                          </div>

                          {/* Right: Stats and Button */}
                          <div className="flex items-center gap-6">
                            <div className="text-right space-y-1">
                              {scorePercentage !== null && (
                                <div className="text-sm">
                                  <span className="text-neutral-400">Score: </span>
                                  <span className="font-medium text-neutral-100">{scorePercentage.toFixed(1)}%</span>
                                </div>
                              )}
                              {percentile !== null && (
                                <div className="text-sm">
                                  <span className="text-neutral-400">Percentile: </span>
                                  <span className="font-medium text-neutral-100">{percentile.toFixed(1)}%</span>
                                </div>
                              )}
                              {paperScore && (
                                <div className="text-sm">
                                  <span className="text-neutral-400">{session.paperName} Score: </span>
                                  <span className="font-medium text-neutral-100">{paperScore}</span>
                                </div>
                              )}
                              <div className="text-xs text-neutral-500">
                                {minutes} min
                              </div>
                            </div>
                            <Button
                              onClick={() => handleViewMarkPage(session.id)}
                              variant="primary"
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              View Mark Page
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="text-sm">No sessions found for the selected filters</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Section Performance Breakdown & Improvement Tracker */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("sections")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Section Performance & Trends
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">
                Track performance and improvement by section
              </p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("sections") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("sections") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {sectionPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-2 py-3 text-xs font-semibold text-white/40 border-b border-white/10">
                      <div className="col-span-3">Section</div>
                      <div className="col-span-2 text-center">Accuracy</div>
                      <div className="col-span-2 text-center">Avg Time/Q</div>
                      <div className="col-span-2 text-center">Guessed %</div>
                      <div className="col-span-2 text-center">Questions</div>
                      <div className="col-span-1 text-center">Trend</div>
                    </div>

                    {/* Section Rows */}
                    {sectionPerformance.map((section) => {
                      const getTrendIcon = () => {
                        if (section.trend === 'improving') {
                          return <TrendingUp className="h-4 w-4 text-green-400" />;
                        } else if (section.trend === 'declining') {
                          return <TrendingDown className="h-4 w-4 text-red-400" />;
                        }
                        return <Minus className="h-4 w-4 text-white/40" />;
                      };

                      const getTrendColor = () => {
                        if (section.trend === 'improving') return 'text-green-400';
                        if (section.trend === 'declining') return 'text-red-400';
                        return 'text-white/60';
                      };

                      return (
                        <div
                          key={section.section}
                          className="grid grid-cols-12 gap-4 px-2 py-4 bg-white/5 rounded-organic-md hover:bg-white/10 transition-colors items-center"
                        >
                          <div className="col-span-3">
                            <div className="font-medium text-white/90">{section.section}</div>
                            {section.trend !== 'stable' && (
                              <div className={cn("text-xs mt-0.5", getTrendColor())}>
                                {section.trend === 'improving' ? '↑' : '↓'} {Math.abs(section.trendValue).toFixed(1)}% vs earlier sessions
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-base font-medium text-white/90">
                              {section.currentAccuracy.toFixed(1)}%
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-sm text-white/80">
                              {(section.avgTimePerQuestion / 60).toFixed(1)} min
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-sm text-white/80">
                              {section.guessedRate.toFixed(1)}%
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-sm text-white/80">
                              {section.correctQuestions}/{section.totalQuestions}
                            </div>
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            {getTrendIcon()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="text-sm">No section data available</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Time Management Insights */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("time")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Time Management Insights
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">
                Optimize your pacing and time allocation
              </p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("time") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("time") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {timeManagementInsights.length > 0 ? (
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-2 py-3 text-xs font-semibold text-white/40 border-b border-white/10">
                      <div className="col-span-3">Section</div>
                      <div className="col-span-2 text-center">Time/Q</div>
                      <div className="col-span-2 text-center">Accuracy</div>
                      <div className="col-span-2 text-center">Efficiency</div>
                      <div className="col-span-3 text-center">Recommendation</div>
                    </div>

                    {/* Insight Rows */}
                    {timeManagementInsights.map((insight) => {
                      const getRecommendationColor = () => {
                        if (insight.recommendation.includes("Optimal") || insight.recommendation.includes("Efficient")) {
                          return "text-green-400";
                        } else if (insight.recommendation.includes("Too slow") || insight.recommendation.includes("Too fast")) {
                          return "text-red-400";
                        }
                        return "text-yellow-400";
                      };

                      return (
                        <div
                          key={insight.section}
                          className="grid grid-cols-12 gap-4 px-2 py-4 bg-white/5 rounded-organic-md hover:bg-white/10 transition-colors items-center"
                        >
                          <div className="col-span-3">
                            <div className="font-medium text-white/90">{insight.section}</div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-base font-medium text-white/90">
                              {(insight.avgTimePerQuestion / 60).toFixed(1)} min
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-sm text-white/80">
                              {insight.accuracy.toFixed(1)}%
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-sm text-white/80">
                              {insight.efficiencyScore.toFixed(2)} q/min
                            </div>
                          </div>
                          <div className={cn("col-span-3 text-center text-xs", getRecommendationColor())}>
                            {insight.recommendation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="text-sm">No time management data available</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Container>
  );
}
