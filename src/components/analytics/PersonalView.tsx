/**
 * Personal analytics view - personal stats, insights, and progress
 */

"use client";

import { useMemo, useState } from "react";
import { StatsHero } from "./StatsHero";
import { PerformanceChartsSection } from "./PerformanceChartsSection";
import { PastSessionsSection } from "./PastSessionsSection";
import { TopicsOverviewSection } from "./TopicsOverviewSection";
import {
  TimeRange,
  UserStats,
  PerformanceDataPoint,
  TrendData,
  SessionSummary,
} from "@/types/analytics";

interface PersonalViewProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  userStats: UserStats;
  performanceData: PerformanceDataPoint[];
  insights: any[];
  strongest: any;
  weakest: any;
  accuracy: number;
  avgSpeed: number;
  accuracyTrend: TrendData;
  speedTrend: TrendData;
  questionsTrend: TrendData;
  sessions: SessionSummary[];
}

export function PersonalView({
  timeRange,
  onTimeRangeChange,
  userStats,
  performanceData,
  insights,
  strongest,
  weakest,
  accuracy,
  avgSpeed,
  accuracyTrend,
  speedTrend,
  questionsTrend,
  sessions,
}: PersonalViewProps) {
  const [scrollToTopicId, setScrollToTopicId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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

  const handleTopicClick = (topicId: string, topicName: string) => {
    setScrollToTopicId(topicId);
    // Scroll to topic in the overview section
    setTimeout(() => {
      const element = document.getElementById(`topic-${topicId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* 1. Stats Hero */}
      <StatsHero
        totalQuestions={userStats.totalQuestions}
        accuracy={accuracy}
        avgSpeed={avgSpeed}
        currentStreak={userStats.currentStreak}
        longestStreak={userStats.longestStreak}
        questionsTrend={questionsTrend}
        accuracyTrend={accuracyTrend}
        speedTrend={speedTrend}
        strongest={strongest}
        weakest={weakest}
        onTopicClick={handleTopicClick}
        isCollapsed={collapsedSections.has("overview")}
        onToggleCollapse={() => toggleSection("overview")}
      />

      {/* 2. Performance Charts */}
      <PerformanceChartsSection 
        performanceData={performanceData}
        isCollapsed={collapsedSections.has("performance")}
        onToggleCollapse={() => toggleSection("performance")}
      />

      {/* 3. Past Sessions */}
      <PastSessionsSection 
        sessions={sessions}
        isCollapsed={collapsedSections.has("sessions")}
        onToggleCollapse={() => toggleSection("sessions")}
      />

      {/* 4. Topics Overview (merged strongest/weakest + detail) */}
      <TopicsOverviewSection
        userStats={userStats}
        strongest={strongest}
        weakest={weakest}
        isCollapsed={collapsedSections.has("topics")}
        onToggleCollapse={() => toggleSection("topics")}
      />
    </div>
  );
}
