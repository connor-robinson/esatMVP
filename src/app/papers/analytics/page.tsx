/**
 * Papers Analytics page - Detailed analytics for paper performance
 */

"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { AnalyticsTrendChart } from "@/components/papers/AnalyticsTrendChart";
import { MistakeChart } from "@/components/papers/MistakeChart";
import { FileText, ChevronDown, TrendingUp, TrendingDown, Minus, Trash2, X } from "lucide-react";
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
import { deletePaperSession } from "@/lib/supabase/papers";

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
  
  // Filter states for Performance Trends
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPaperTypes, setSelectedPaperTypes] = useState<PaperType[]>([]);
  
  // Multi-select dropdown states
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [paperTypeDropdownOpen, setPaperTypeDropdownOpen] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const paperTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target as Node)) {
        setTopicDropdownOpen(false);
      }
      if (paperTypeDropdownRef.current && !paperTypeDropdownRef.current.contains(event.target as Node)) {
        setPaperTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Helper function to map topic filter to sections
  const topicToSections = (topic: string): PaperSection[] => {
    switch (topic) {
      case "Math 1":
        return ["Mathematics", "Math"];
      case "Math 2":
        return ["Advanced Math", "Advanced Mathematics and Advanced Physics"];
      case "All maths":
        return ["Mathematics", "Math", "Advanced Math", "Advanced Mathematics and Advanced Physics"];
      case "Physics":
        return ["Physics"];
      case "Chemistry":
        return ["Chemistry"];
      case "Biology":
        return ["Biology"];
      default:
        return [];
    }
  };

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    let filtered = filterSessions(sessions, {
      paperType: selectedPaper,
      section: selectedSection,
      timeRange,
    });

    // Apply topic filters (for Performance Trends)
    if (selectedTopics.length > 0) {
      const topicSections = new Set<PaperSection>();
      selectedTopics.forEach(topic => {
        topicToSections(topic).forEach(sec => topicSections.add(sec));
      });
      filtered = filtered.filter(s => {
        if (!s.selectedSections || s.selectedSections.length === 0) return false;
        return s.selectedSections.some(sec => topicSections.has(sec));
      });
    }

    // Apply paper type filters (for Performance Trends)
    if (selectedPaperTypes.length > 0) {
      filtered = filtered.filter(s => selectedPaperTypes.includes(s.paperName));
    }

    return filtered;
  }, [sessions, selectedPaper, selectedSection, timeRange, selectedTopics, selectedPaperTypes]);

  // Calculate trend data with percentiles (use filtered sessions for chart)
  const trendDataWithPercentiles = useMemo(() => {
    return calculateTrendDataWithPercentiles(filteredSessions);
  }, [filteredSessions]);

  // Convert percentile data to format expected by chart (we'll update the chart to use percentile instead of percentage)
  const trendDataForChart = useMemo(() => {
    return trendDataWithPercentiles.map(d => ({
      date: d.date,
      percentage: d.percentile, // Chart will display this as percentile
      paperType: d.paperType,
      section: d.section,
      rawScore: d.rawScore, // Include raw score for tooltip
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

  // Use all sorted sessions (removed limit for full scrollability)
  const visibleSessions = useMemo(() => {
    return sortedSessions;
  }, [sortedSessions]);

  // Calculate section performance with trends
  const sectionPerformance = useMemo(() => {
    return calculateSectionPerformance(filteredSessions);
  }, [filteredSessions]);

  // Calculate time management insights
  const timeManagementInsights = useMemo(() => {
    return calculateTimeManagementInsights(filteredSessions);
  }, [filteredSessions]);

  // Aggregate mistake tags across all sessions
  const aggregatedMistakeTags = useMemo(() => {
    const allMistakes: any[] = [];
    filteredSessions.forEach(session => {
      if (session.mistakeTags && session.mistakeTags.length > 0) {
        allMistakes.push(...session.mistakeTags);
      }
    });
    return allMistakes;
  }, [filteredSessions]);

  // Aggregate guessing data across all sessions (use all sessions, not filtered)
  const guessingStats = useMemo(() => {
    let totalGuessed = 0;
    let correctGuesses = 0;
    let wrongGuesses = 0;
    let guessedIndices: number[] = [];
    let allGuessedFlags: boolean[] = [];
    let allCorrectFlags: (boolean | null)[] = [];
    let allPerQuestionSec: number[] = [];

    // Use all sessions to analyze every guess made
    sessions.forEach(session => {
      if (session.guessedFlags && session.correctFlags && session.perQuestionSec) {
        session.guessedFlags.forEach((guessed, idx) => {
          if (guessed) {
            totalGuessed++;
            guessedIndices.push(allGuessedFlags.length);
            const correct = session.correctFlags[idx];
            if (correct === true) correctGuesses++;
            else if (correct === false) wrongGuesses++;
          }
          allGuessedFlags.push(guessed);
          allCorrectFlags.push(session.correctFlags[idx] ?? null);
          allPerQuestionSec.push(session.perQuestionSec[idx] || 0);
        });
      }
    });

    const accuracy = totalGuessed > 0 ? (correctGuesses / totalGuessed) * 100 : 0;
    const timeOnGuessed = guessedIndices.reduce((sum, idx) => sum + (allPerQuestionSec[idx] || 0), 0);
    const totalTime = allPerQuestionSec.reduce((sum, t) => sum + t, 0);
    const shareOfTotalTime = totalTime > 0 ? (timeOnGuessed / totalTime) * 100 : 0;

    // Calculate average times for correct vs wrong guesses
    const correctGuessTimes = guessedIndices
      .filter(idx => allCorrectFlags[idx] === true)
      .map(idx => allPerQuestionSec[idx] || 0);
    const wrongGuessTimes = guessedIndices
      .filter(idx => allCorrectFlags[idx] === false)
      .map(idx => allPerQuestionSec[idx] || 0);
    const avgTimeCorrectGuess = correctGuessTimes.length > 0
      ? correctGuessTimes.reduce((a, b) => a + b, 0) / correctGuessTimes.length
      : 0;
    const avgTimeWrongGuess = wrongGuessTimes.length > 0
      ? wrongGuessTimes.reduce((a, b) => a + b, 0) / wrongGuessTimes.length
      : 0;

    return {
      totalGuessed,
      correctGuesses,
      wrongGuesses,
      accuracy: Math.round(accuracy),
      shareOfTotalTime: Math.round(shareOfTotalTime),
      avgTimeCorrectGuess,
      avgTimeWrongGuess,
      allGuessedFlags,
      allCorrectFlags,
      allPerQuestionSec,
    };
  }, [sessions]);

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

  // Function to delete session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      await deletePaperSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
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
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Average Score</div>
                    <div className="text-2xl font-bold text-white/95 leading-none">{Math.round(analytics.averageScore)}%</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Sessions Completed</div>
                    <div className="text-2xl font-bold text-white/95 leading-none">{analytics.totalSessions}</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Avg Time</div>
                    <div className="text-2xl font-bold text-white/95 leading-none">{Math.round(analytics.averageTime)} min</div>
                  </div>
                  <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Sections Practiced</div>
                    <div className="text-2xl font-bold text-white/95 leading-none">{sectionsPracticed}</div>
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
                {/* Filter Dropdowns */}
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                  {/* By Topic Filter */}
                  <div className="relative" ref={topicDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setTopicDropdownOpen(!topicDropdownOpen);
                        setPaperTypeDropdownOpen(false);
                      }}
                      className="h-10 pl-4 pr-10 rounded-lg bg-white/5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all backdrop-blur-sm cursor-pointer flex items-center justify-between min-w-[160px]"
                    >
                      <span className="truncate text-left">
                        {selectedTopics.length === 0 ? "By Topic" : `${selectedTopics.length} selected`}
                      </span>
                      <ChevronDown
                        className={cn(
                          "absolute right-3 w-4 h-4 text-white/50 pointer-events-none transition-transform",
                          topicDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {topicDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setTopicDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full mt-2 w-full bg-white/5 backdrop-blur-xl rounded-lg shadow-2xl z-50 overflow-hidden min-w-[200px]"
                          >
                            <div className="max-h-60 overflow-y-auto">
                              {["Math 1", "Math 2", "All maths", "Physics", "Chemistry", "Biology"].map((topic) => (
                                <button
                                  key={topic}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTopics(prev =>
                                      prev.includes(topic)
                                        ? prev.filter(t => t !== topic)
                                        : [...prev, topic]
                                    );
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-2",
                                    selectedTopics.includes(topic)
                                      ? "bg-white/10 text-white"
                                      : "text-white/70 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    selectedTopics.includes(topic)
                                      ? "bg-primary border-primary"
                                      : "border-white/30"
                                  )}>
                                    {selectedTopics.includes(topic) && (
                                      <div className="w-2 h-2 bg-white rounded-sm" />
                                    )}
                                  </div>
                                  {topic}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* By Paper Type Filter */}
                  <div className="relative" ref={paperTypeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setPaperTypeDropdownOpen(!paperTypeDropdownOpen);
                        setTopicDropdownOpen(false);
                      }}
                      className="h-10 pl-4 pr-10 rounded-lg bg-white/5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all backdrop-blur-sm cursor-pointer flex items-center justify-between min-w-[160px]"
                    >
                      <span className="truncate text-left">
                        {selectedPaperTypes.length === 0 ? "By Paper Type" : `${selectedPaperTypes.length} selected`}
                      </span>
                      <ChevronDown
                        className={cn(
                          "absolute right-3 w-4 h-4 text-white/50 pointer-events-none transition-transform",
                          paperTypeDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {paperTypeDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setPaperTypeDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full mt-2 w-full bg-white/5 backdrop-blur-xl rounded-lg shadow-2xl z-50 overflow-hidden min-w-[200px]"
                          >
                            <div className="max-h-60 overflow-y-auto">
                              {(["TMUA", "ESAT", "NSAA", "ENGAA", "PAT", "MAT", "OTHER"] as PaperType[]).map((paperType) => (
                                <button
                                  key={paperType}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaperTypes(prev =>
                                      prev.includes(paperType)
                                        ? prev.filter(t => t !== paperType)
                                        : [...prev, paperType]
                                    );
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-2",
                                    selectedPaperTypes.includes(paperType)
                                      ? "bg-white/10 text-white"
                                      : "text-white/70 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    selectedPaperTypes.includes(paperType)
                                      ? "bg-primary border-primary"
                                      : "border-white/30"
                                  )}>
                                    {selectedPaperTypes.includes(paperType) && (
                                      <div className="w-2 h-2 bg-white rounded-sm" />
                                    )}
                                  </div>
                                  {paperType}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

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
                className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 border-0"
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
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {/* Column Headers */}
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 mb-2 text-xs font-semibold text-white/40 border-b border-white/10 sticky top-0 bg-[#121418] z-10">
                      <div className="col-span-4">Paper</div>
                      <div className="col-span-1 text-center">%</div>
                      <div className="col-span-1 text-center">Score</div>
                      <div className="col-span-1 text-center">Percentile</div>
                      <div className="col-span-1 text-center">Time</div>
                      <div className="col-span-2 text-center">Date</div>
                      <div className="col-span-2"></div>
                    </div>

                    {/* Session Rows */}
                    <div className="space-y-1">
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

                        // Calculate converted score (for ENGAA/NSAA/TMUA with conversion tables)
                        // Note: This requires question data and conversion tables which we don't have here
                        // For now, we'll show the raw percentage as the score
                        // TODO: Calculate actual converted score when question data is available
                        const convertedScore: number | null = scorePercentage !== null 
                          ? (session.paperName === "ENGAA" || session.paperName === "NSAA" || session.paperName === "TMUA")
                            ? null // Would need conversion table calculation
                            : null
                          : null;

                        return (
                          <button
                            key={session.id}
                            onClick={() => handleViewMarkPage(session.id)}
                            className="w-full text-left grid grid-cols-12 gap-4 px-5 py-4 bg-white/5 rounded-organic-md hover:bg-white/10 transition-colors items-center"
                          >
                            {/* Paper Name & Sections */}
                            <div className="col-span-4 flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: desaturateColor(iconColor, 0.3) }}
                              >
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-white/90 truncate">
                                  {mainTitle}
                                </div>
                                <div className="text-xs text-white/60 truncate mt-0.5">
                                  {sectionInfo}
                                </div>
                              </div>
                            </div>

                            {/* Percentage */}
                            <div className="col-span-1 flex items-center justify-center">
                              {scorePercentage !== null ? (
                                <span className="text-sm text-white/80">
                                  {scorePercentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-white/40">—</span>
                              )}
                            </div>

                            {/* Score (converted for ENGAA/NSAA/TMUA) */}
                            <div className="col-span-1 flex items-center justify-center">
                              {scorePercentage !== null && (session.paperName === "ENGAA" || session.paperName === "NSAA" || session.paperName === "TMUA") ? (
                                <span className="text-xs text-white/40 italic">—</span>
                              ) : (
                                <span className="text-xs text-white/40">—</span>
                              )}
                            </div>

                            {/* Percentile */}
                            <div className="col-span-1 flex items-center justify-center">
                              {percentile !== null ? (
                                <span className="text-sm text-white/80 font-medium">
                                  {percentile.toFixed(1)}th
                                </span>
                              ) : (
                                <span className="text-xs text-white/40">—</span>
                              )}
                            </div>

                            {/* Time */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-sm text-white/60">
                                {minutes}m
                              </span>
                            </div>

                            {/* Date */}
                            <div className="col-span-2 flex items-center justify-center">
                              <span className="text-sm text-white/60">
                                {date}
                              </span>
                            </div>

                            {/* Mark Button and Delete Button */}
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewMarkPage(session.id);
                                }}
                                variant="secondary"
                                size="sm"
                                className="whitespace-nowrap text-xs border-0"
                              >
                                Mark
                              </Button>
                              <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors flex-shrink-0"
                                aria-label="Delete session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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

        {/* 4. Mistake Breakdown Chart */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("mistakes")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Mistake Breakdown
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">
                Common mistake patterns across all sessions
              </p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("mistakes") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("mistakes") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <MistakeChart mistakeTags={aggregatedMistakeTags} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Guess Distribution & Time Distribution */}
        <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
          <button
            onClick={() => toggleSection("distribution")}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
                Guessing Behavior & Time Distribution
              </h2>
              <p className="text-sm text-white/60 mt-1 text-left">
                Analyze guessing patterns and time allocation
              </p>
            </div>
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                collapsedSections.has("distribution") && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {!collapsedSections.has("distribution") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-6">
                  {/* Guessing Stats */}
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-white/90">Guessing Behavior</div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-md bg-neutral-900 text-center">
                        <div className="text-xs text-white/40 mb-1">Total Guessed</div>
                        <div className="text-lg font-semibold text-white/90">{guessingStats.totalGuessed}</div>
                      </div>
                      <div className="p-3 rounded-md bg-neutral-900 text-center">
                        <div className="text-xs text-white/40 mb-1">Correct Guesses</div>
                        <div className="text-lg font-semibold text-white/90">{guessingStats.correctGuesses}</div>
                      </div>
                      <div className="p-3 rounded-md bg-neutral-900 text-center">
                        <div className="text-xs text-white/40 mb-1">Guess Accuracy</div>
                        <div className="text-lg font-semibold text-white/90">{guessingStats.accuracy}%</div>
                      </div>
                      <div className="p-3 rounded-md bg-neutral-900 text-center">
                        <div className="text-xs text-white/40 mb-1">Time on Guesses</div>
                        <div className="text-lg font-semibold text-white/90">{guessingStats.shareOfTotalTime}%</div>
                      </div>
                    </div>

                    {/* Guess Time Split */}
                    {guessingStats.totalGuessed > 0 && (
                      <div>
                        <div className="text-xs text-white/40 mb-2">Guess time split: correct vs wrong</div>
                        <div className="w-full h-6 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                          <div className="flex w-full h-full">
                            {(() => {
                              const correctTime = guessingStats.correctGuesses * guessingStats.avgTimeCorrectGuess;
                              const wrongTime = guessingStats.wrongGuesses * guessingStats.avgTimeWrongGuess;
                              const totalGuessTime = Math.max(1e-6, correctTime + wrongTime);
                              const correctPct = Math.round((correctTime / totalGuessTime) * 100);
                              const wrongPct = Math.max(0, 100 - correctPct);
                              
                              return (
                                <>
                                  <div
                                    className="h-full flex items-center justify-center text-[11px] font-medium"
                                    style={{ width: `${correctPct}%`, backgroundColor: `rgba(78, 107, 138, 0.8)` }}
                                  >
                                    {correctPct >= 12 ? `${correctPct}%` : ''}
                                  </div>
                                  <div
                                    className="h-full flex items-center justify-center text-[11px] font-medium"
                                    style={{ width: `${wrongPct}%`, backgroundColor: `rgba(140, 82, 90, 0.8)` }}
                                  >
                                    {wrongPct >= 12 ? `${wrongPct}%` : ''}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: '#4e6b8a' }} />
                            <span>Correct • {guessingStats.correctGuesses} qns • avg {Math.round(guessingStats.avgTimeCorrectGuess)}s</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: '#8c525a' }} />
                            <span>Wrong • {guessingStats.wrongGuesses} qns • avg {Math.round(guessingStats.avgTimeWrongGuess)}s</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Guess Distribution Chart */}
                    {guessingStats.allGuessedFlags.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-white/200 mb-2">Guess Distribution</div>
                        {(() => {
                          const questionNumbers = Array.from({ length: guessingStats.allGuessedFlags.length }, (_, i) => i + 1);
                          const w = Math.max(420, questionNumbers.length * 14 + 16);
                          const h = 96; const pad = 12; const stripH = 16; const plotH = h - stripH - pad*3;
                          const windowSize = 2;
                          const vals = questionNumbers.map((_, i) => {
                            let s = 0; let c = 0;
                            for (let j = Math.max(0, i-windowSize); j <= Math.min(questionNumbers.length-1, i+windowSize); j++) { 
                              c++; 
                              s += (guessingStats.allGuessedFlags[j] ? 1 : 0); 
                            }
                            return s / Math.max(1, c);
                          });
                          const toX = (i:number) => pad + (i/(Math.max(1, vals.length-1))) * (w-2*pad);
                          const toY = (v:number) => pad + (plotH - v * plotH);
                          const path = vals.map((v,i) => `${i===0?'M':'L'} ${toX(i)},${toY(v)}`).join(' ');
                          const area = `M ${toX(0)},${toY(0)} ` + vals.map((v,i)=>`L ${toX(i)},${toY(v)}`).join(' ') + ` L ${toX(vals.length-1)},${toY(0)} Z`;
                          const guessColor = '#9e5974';
                          const correctBorder = '#4e6b8a';
                          const wrongBorder = '#8c525a';
                          const len = Math.max(1, questionNumbers.length);
                          const innerW = w - 2*pad;
                          const step = innerW / len;
                          const desiredBlockW = step - 2;
                          const blockW = Math.max(10, desiredBlockW);
                          const blockInset = Math.max(1, (step - (blockW - 2)) / 2);
                          
                          return (
                            <div className="overflow-x-auto flex justify-center">
                              <svg width={w} height={h} className="block">
                                <path d={area} fill={`${guessColor}33`} />
                                <path d={path} stroke={guessColor} strokeWidth={2} fill="none" />
                                {questionNumbers.map((qn, idx) => {
                                  const bandStart = pad + idx * step;
                                  const rectX = bandStart + blockInset;
                                  const guessed = guessingStats.allGuessedFlags[idx] === true;
                                  const corr = guessingStats.allCorrectFlags[idx];
                                  const fill = guessed ? guessColor : '#1a1f27';
                                  const border = corr === true ? correctBorder : (corr === false ? wrongBorder : 'rgba(255,255,255,0.12)');
                                  return (
                                    <g key={qn}>
                                      <title>{`Q${qn}${guessed ? ' • Guessed' : ''}${corr===true?' • Correct':(corr===false?' • Wrong':'')}`}</title>
                                      <rect x={rectX} y={h - pad - stripH} width={blockW - 2} height={stripH} rx={4} ry={4} fill={fill} stroke={border} strokeWidth={1} />
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Time Distribution */}
                  {guessingStats.allPerQuestionSec.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-white/90">Time Distribution</div>
                      {(() => {
                        const times = guessingStats.allPerQuestionSec;
                        const total = times.reduce((a, b) => a + b, 0);
                        const correctTimes: number[] = [];
                        const wrongTimes: number[] = [];
                        times.forEach((t, i) => {
                          const corr = guessingStats.allCorrectFlags[i];
                          if (corr === true) correctTimes.push(t);
                          else if (corr === false) wrongTimes.push(t);
                        });
                        const correctTime = correctTimes.reduce((a, b) => a + b, 0);
                        const wrongTime = wrongTimes.reduce((a, b) => a + b, 0);
                        const correctPct = Math.min(100, Math.round((correctTime / Math.max(1, total)) * 100));
                        const wrongPct = Math.max(0, 100 - correctPct);
                        
                        return (
                          <div>
                            <div className="text-xs text-white/40 mb-2">Time split: correct vs wrong answers</div>
                            <div className="w-full h-6 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                              <div className="flex w-full h-full">
                                <div
                                  className="h-full flex items-center justify-center text-[11px] font-medium"
                                  style={{ width: `${correctPct}%`, backgroundColor: `rgba(78, 107, 138, 0.8)` }}
                                >
                                  {correctPct >= 12 ? `${correctPct}%` : ''}
                                </div>
                                <div
                                  className="h-full flex items-center justify-center text-[11px] font-medium"
                                  style={{ width: `${wrongPct}%`, backgroundColor: `rgba(140, 82, 90, 0.8)` }}
                                >
                                  {wrongPct >= 12 ? `${wrongPct}%` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
                              <span>Correct {correctPct}%</span>
                              <span>Wrong {wrongPct}%</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Container>
  );
}
