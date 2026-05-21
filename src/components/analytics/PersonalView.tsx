/**
 * Mental Maths personal analytics — overview → trends → session history → mistakes
 */

"use client";

import { useState } from "react";
import { StatsHero } from "./StatsHero";
import { PerformanceChartsSection } from "./PerformanceChartsSection";
import { SessionsHistorySection } from "./SessionsHistorySection";
import { MistakeAnalysisSection } from "./MistakeAnalysisSection";
import {
  UserStats,
  PerformanceDataPoint,
  TrendData,
  SessionSummary,
} from "@/types/analytics";

interface PersonalViewProps {
  userStats: UserStats;
  performanceData: PerformanceDataPoint[];
  strongest: any;
  weakest: any;
  accuracy: number;
  avgSpeed: number;
  accuracyTrend: TrendData;
  speedTrend: TrendData;
  questionsTrend: TrendData;
  sessions: SessionSummary[];
  onDeleteSession: (sessionId: string) => Promise<void>;
  onClearAllSessions: () => Promise<void>;
}

export function PersonalView({
  userStats,
  performanceData,
  strongest,
  weakest,
  accuracy,
  avgSpeed,
  accuracyTrend,
  speedTrend,
  questionsTrend,
  sessions,
  onDeleteSession,
  onClearAllSessions,
}: PersonalViewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

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
        variant="drill"
        sessions={sessions}
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

      <PerformanceChartsSection
        sessions={sessions}
        performanceData={performanceData}
        isCollapsed={collapsedSections.has("performance")}
        onToggleCollapse={() => toggleSection("performance")}
      />

      <SessionsHistorySection
        sessions={sessions}
        isCollapsed={collapsedSections.has("sessions")}
        onToggleCollapse={() => toggleSection("sessions")}
        onDeleteSession={onDeleteSession}
        onClearAllSessions={onClearAllSessions}
      />

      <MistakeAnalysisSection
        sessions={sessions}
        isCollapsed={collapsedSections.has("mistakes")}
        onToggleCollapse={() => toggleSection("mistakes")}
      />
    </div>
  );
}
