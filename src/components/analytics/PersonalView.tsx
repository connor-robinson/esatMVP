/**
 * Personal analytics view - personal stats, insights, and progress
 */

"use client";

import { useState } from "react";
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
  WrongQuestionPattern,
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
  commonMistakesMap?: Map<string, WrongQuestionPattern[]>;
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
  commonMistakesMap,
}: PersonalViewProps) {
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

  const handleTopicClick = (topicId: string, _topicName: string) => {
    // Scroll to topic in Topic Performance section
    setTimeout(() => {
      const element = document.getElementById(`topic-${topicId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
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

      <TopicsOverviewSection
        userStats={userStats}
        strongest={strongest}
        weakest={weakest}
        isCollapsed={collapsedSections.has("topics")}
        onToggleCollapse={() => toggleSection("topics")}
        commonMistakesMap={commonMistakesMap}
      />

      <PerformanceChartsSection
        performanceData={performanceData}
        isCollapsed={collapsedSections.has("performance")}
        onToggleCollapse={() => toggleSection("performance")}
      />

      <PastSessionsSection
        sessions={sessions}
        isCollapsed={collapsedSections.has("sessions")}
        onToggleCollapse={() => toggleSection("sessions")}
      />
    </div>
  );
}
