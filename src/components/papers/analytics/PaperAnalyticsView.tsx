'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PaperType, PaperSection, PaperSession } from '@/types/papers';
import {
  calculateSessionAnalytics,
  enrichPaperSessionsWithPercentiles,
  filterPaperSessionsByTopicAndType,
  filterSessions,
} from '@/lib/papers/analytics';
import { PaperStatsOverview } from './PaperStatsOverview';
import { PaperPerformanceTrendsSection } from './PaperPerformanceTrendsSection';
import { PaperSessionsHistorySection } from './PaperSessionsHistorySection';
import { PaperMistakeAnalysisSection } from './PaperMistakeAnalysisSection';

interface PaperAnalyticsViewProps {
  sessions: PaperSession[];
  highlightedSessionId: string | null;
  onViewMarkPage: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClearAllSessions: () => Promise<void>;
}

export function PaperAnalyticsView({
  sessions,
  highlightedSessionId,
  onViewMarkPage,
  onDeleteSession,
  onClearAllSessions,
}: PaperAnalyticsViewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPaperTypes, setSelectedPaperTypes] = useState<PaperType[]>([]);

  useEffect(() => {
    if (!highlightedSessionId) return;
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete('sessions');
      return next;
    });
  }, [highlightedSessionId]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const baseFiltered = useMemo(
    () =>
      filterSessions(sessions, {
        paperType: 'ALL',
        section: 'ALL' as PaperSection | 'ALL',
        timeRange: 'all',
      }),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const narrowed = filterPaperSessionsByTopicAndType(
      baseFiltered,
      selectedTopics,
      selectedPaperTypes,
    );
    return enrichPaperSessionsWithPercentiles(narrowed);
  }, [baseFiltered, selectedTopics, selectedPaperTypes]);

  const analytics = useMemo(
    () => calculateSessionAnalytics(filteredSessions),
    [filteredSessions],
  );

  const highestPredictedScore = useMemo(() => {
    let max: number | null = null;
    for (const session of filteredSessions) {
      const score = session.predictedScore;
      if (typeof score !== 'number' || !Number.isFinite(score)) continue;
      max = max === null ? score : Math.max(max, score);
    }
    return max;
  }, [filteredSessions]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PaperStatsOverview
        analytics={analytics}
        highestPredictedScore={highestPredictedScore}
        isCollapsed={collapsedSections.has('overview')}
        onToggleCollapse={() => toggleSection('overview')}
      />

      <PaperPerformanceTrendsSection
        sessions={filteredSessions}
        selectedTopics={selectedTopics}
        onSelectedTopicsChange={setSelectedTopics}
        selectedPaperTypes={selectedPaperTypes}
        onSelectedPaperTypesChange={setSelectedPaperTypes}
        isCollapsed={collapsedSections.has('performance')}
        onToggleCollapse={() => toggleSection('performance')}
      />

      <PaperSessionsHistorySection
        sessions={filteredSessions}
        allSessionCount={sessions.length}
        highlightedSessionId={highlightedSessionId}
        isCollapsed={collapsedSections.has('sessions')}
        onToggleCollapse={() => toggleSection('sessions')}
        onViewMarkPage={onViewMarkPage}
        onDeleteSession={onDeleteSession}
        onClearAllSessions={onClearAllSessions}
      />

      <PaperMistakeAnalysisSection
        sessions={filteredSessions}
        isCollapsed={collapsedSections.has('mistakes')}
        onToggleCollapse={() => toggleSection('mistakes')}
      />
    </div>
  );
}
