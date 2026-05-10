/**
 * Papers Analytics page - Detailed analytics for paper performance
 */

'use client';

import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { AnalyticsTrendChart } from '@/components/papers/AnalyticsTrendChart';
import { MistakeChart } from '@/components/papers/MistakeChart';
import {
  FileText,
  ChevronDown,
  Trash2,
  X,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import type { PaperType, PaperSection } from '@/types/papers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchUserSessions,
  filterSessions,
  calculateTrendDataWithPercentiles,
  calculateSessionAnalytics,
  extractYearFromVariant,
  calculatePercentileFromPaperDistribution,
  calculateSectionPerformance,
  calculateTimeManagementInsights,
} from '@/lib/papers/analytics';
import type { PaperSession } from '@/types/papers';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import {
  getPaperTypeColor,
  desaturateColor,
} from '@/config/colors';
import { cn } from '@/lib/utils';
import { deletePaperSession } from '@/lib/supabase/papers';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl border border-border-subtle bg-surface-elevated p-6 sm:p-8';

export default function PapersAnalyticsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPaper, setSelectedPaper] = useState<PaperType | 'ALL'>('ALL');
  const [selectedSection, setSelectedSection] = useState<PaperSection | 'ALL'>(
    'ALL',
  );
  const [timeRange, setTimeRange] = useState<
    'week' | 'month' | 'quarter' | 'all'
  >('all');
  const [sessionSortBy, setSessionSortBy] = useState<
    'recent' | 'percentage' | 'percentile'
  >('recent');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [highlightedSessionId, setHighlightedSessionId] = useState<
    string | null
  >(null);

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPaperTypes, setSelectedPaperTypes] = useState<PaperType[]>([]);

  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [paperTypeDropdownOpen, setPaperTypeDropdownOpen] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const paperTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        topicDropdownRef.current &&
        !topicDropdownRef.current.contains(event.target as Node)
      ) {
        setTopicDropdownOpen(false);
      }
      if (
        paperTypeDropdownRef.current &&
        !paperTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setPaperTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserSessions()
        .then((data) => {
          setSessions(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');

    if (highlightId && sessions.length > 0 && !loading) {
      setHighlightedSessionId(highlightId);

      if (collapsedSections.has('sessions')) {
        setCollapsedSections((prev) => {
          const next = new Set(prev);
          next.delete('sessions');
          return next;
        });
      }

      setTimeout(() => {
        const sessionElement = document.querySelector(
          `[data-session-id="${highlightId}"]`,
        );
        if (sessionElement) {
          sessionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          setTimeout(() => {
            setHighlightedSessionId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('highlight');
            router.replace(url.pathname + url.search);
          }, 5000);
        }
      }, 300);
    }
  }, [sessions, loading, collapsedSections, router]);

  const topicToSections = (topic: string): PaperSection[] => {
    switch (topic) {
      case 'Math 1':
        return ['Mathematics', 'Math'];
      case 'Math 2':
        return ['Advanced Math', 'Advanced Mathematics and Advanced Physics'];
      case 'All maths':
        return [
          'Mathematics',
          'Math',
          'Advanced Math',
          'Advanced Mathematics and Advanced Physics',
        ];
      case 'Physics':
        return ['Physics'];
      case 'Chemistry':
        return ['Chemistry'];
      case 'Biology':
        return ['Biology'];
      default:
        return [];
    }
  };

  const filteredSessions = useMemo(() => {
    let filtered = filterSessions(sessions, {
      paperType: selectedPaper,
      section: selectedSection,
      timeRange,
    });

    if (selectedTopics.length > 0) {
      const topicSections = new Set<PaperSection>();
      selectedTopics.forEach((topic) => {
        topicToSections(topic).forEach((sec) => topicSections.add(sec));
      });
      filtered = filtered.filter((s) => {
        if (!s.selectedSections || s.selectedSections.length === 0)
          return false;
        return s.selectedSections.some((sec) => topicSections.has(sec));
      });
    }

    if (selectedPaperTypes.length > 0) {
      filtered = filtered.filter((s) =>
        selectedPaperTypes.includes(s.paperName),
      );
    }

    return filtered;
  }, [
    sessions,
    selectedPaper,
    selectedSection,
    timeRange,
    selectedTopics,
    selectedPaperTypes,
  ]);

  const trendDataWithPercentiles = useMemo(() => {
    return calculateTrendDataWithPercentiles(filteredSessions);
  }, [filteredSessions]);

  const trendDataForChart = useMemo(() => {
    return trendDataWithPercentiles.map((d) => ({
      date: d.date,
      percentage: d.percentile,
      paperType: d.paperType,
      section: d.section,
      rawScore: d.rawScore,
    }));
  }, [trendDataWithPercentiles]);

  const analytics = useMemo(() => {
    return calculateSessionAnalytics(filteredSessions);
  }, [filteredSessions]);

  const sectionsPracticed = useMemo(() => {
    const sections = new Set<PaperSection>();
    filteredSessions.forEach((s) => {
      s.selectedSections?.forEach((sec) => sections.add(sec));
    });
    return sections.size;
  }, [filteredSessions]);

  const sessionsWithPercentiles = useMemo(() => {
    const scoresByPaper = new Map<PaperType, number[]>();
    filteredSessions
      .filter((s) => s.score)
      .forEach((session) => {
        const paperType = session.paperName;
        const scorePercentage = session.score
          ? (session.score.correct / session.score.total) * 100
          : 0;
        if (!scoresByPaper.has(paperType)) {
          scoresByPaper.set(paperType, []);
        }
        scoresByPaper.get(paperType)!.push(scorePercentage);
      });

    return filteredSessions.map((session) => {
      const scorePercentage = session.score
        ? (session.score.correct / session.score.total) * 100
        : null;
      const allScoresForPaper = scoresByPaper.get(session.paperName) || [];
      const percentile =
        scorePercentage !== null
          ? calculatePercentileFromPaperDistribution(
              scorePercentage,
              allScoresForPaper,
            )
          : null;
      return { ...session, percentile, scorePercentage };
    });
  }, [filteredSessions]);

  const sortedSessions = useMemo(() => {
    const sorted = [...sessionsWithPercentiles];
    if (sessionSortBy === 'recent') {
      sorted.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    } else if (sessionSortBy === 'percentage') {
      sorted.sort(
        (a, b) => (b.scorePercentage || 0) - (a.scorePercentage || 0),
      );
    } else if (sessionSortBy === 'percentile') {
      sorted.sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
    }
    return sorted;
  }, [sessionsWithPercentiles, sessionSortBy]);

  const aggregatedMistakeTags = useMemo(() => {
    const allMistakes: any[] = [];
    filteredSessions.forEach((session) => {
      if (session.mistakeTags && session.mistakeTags.length > 0) {
        allMistakes.push(...session.mistakeTags);
      }
    });
    return allMistakes;
  }, [filteredSessions]);

  const { loadSessionFromDatabase } = usePaperSessionStore();

  const handleViewMarkPage = async (sessionId: string) => {
    try {
      await loadSessionFromDatabase(sessionId);
      router.push('/past-papers/mark');
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      await deletePaperSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleClearAllSessions = async () => {
    if (!session?.user) return;

    setIsClearing(true);
    try {
      const response = await fetch('/api/past-papers/sessions', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear sessions');
      }

      setSessions([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
      alert('Failed to clear session history. Please try again.');
    } finally {
      setIsClearing(false);
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
      <Container size='lg'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <LoadingSpinner size='md' />
        </div>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container size='lg' className='py-10 sm:py-12'>
        <header className='border-b border-border-subtle pb-8'>
          <h1 className='text-3xl font-bold tracking-tight text-text sm:text-4xl'>
            Past Papers Analytics
          </h1>
          <p className='mt-2 max-w-2xl text-sm text-text-muted sm:text-base'>
            Please log in to view your paper analytics.
          </p>
        </header>
      </Container>
    );
  }

  return (
    <Container size='lg' className='space-y-8 py-10 sm:py-12'>
      <header className='border-b border-border-subtle pb-8'>
        <h1 className='text-3xl font-bold tracking-tight text-text sm:text-4xl'>
          Past Papers Analytics
        </h1>
        <p className='mt-2 max-w-2xl text-sm text-text-muted sm:text-base'>
          Review session history and trends across your paper practice.
        </p>
      </header>

      {/* 1. Session History */}
      <div className={sectionShell}>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 flex-1'>
            <h2 className='font-heading text-xl font-bold tracking-tight text-text sm:text-2xl'>
              Session History
            </h2>
            <p className='mt-1 text-sm text-text-muted'>
              Your past paper sessions, sorted and reviewable
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            {!collapsedSections.has('sessions') && (
              <>
                <div className='relative'>
                  <select
                    value={sessionSortBy}
                    onChange={(e) =>
                      setSessionSortBy(
                        e.target.value as 'recent' | 'percentage' | 'percentile',
                      )
                    }
                    className={cn(
                      'appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid py-2.5 pl-4 pr-10 text-sm font-medium text-text',
                      'transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-subtle',
                    )}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value='recent'>Sort by Recent</option>
                    <option value='percentage'>Sort by Percentage</option>
                    <option value='percentile'>Sort by Percentile</option>
                  </select>
                  <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
                </div>
                {sessions.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setShowClearConfirm(true)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-organic-md border border-error/35 bg-error/10 px-4 py-2.5 text-sm font-medium text-error',
                      'transition-colors hover:bg-error/20',
                    )}
                  >
                    Clear All
                    <Trash2 className='h-4 w-4' strokeWidth={2} />
                  </button>
                )}
              </>
            )}
            <button
              type='button'
              onClick={() => toggleSection('sessions')}
              className='group inline-flex h-10 w-10 items-center justify-center rounded-organic-md border border-border bg-surface-mid text-text-muted transition-colors hover:bg-surface-neutral hover:text-text'
              aria-label={
                collapsedSections.has('sessions')
                  ? 'Expand session history'
                  : 'Collapse session history'
              }
            >
              <ChevronDown
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  collapsedSections.has('sessions') && 'rotate-180',
                )}
              />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsedSections.has('sessions') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className='overflow-hidden'
            >
              {sortedSessions.length > 0 ? (
                <div className='overflow-x-auto rounded-organic-lg border border-border-subtle'>
                  <table className='w-full min-w-[720px] border-collapse text-left text-sm'>
                    <thead>
                      <tr className='border-b border-border-subtle bg-surface-mid/80 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted'>
                        <th className='px-4 py-3'>Paper</th>
                        <th className='px-4 py-3'>Sections</th>
                        <th className='px-4 py-3 text-right tabular-nums'>%</th>
                        <th className='px-4 py-3 text-right tabular-nums'>Percentile</th>
                        <th className='px-4 py-3 text-right tabular-nums'>Time</th>
                        <th className='px-4 py-3 text-right tabular-nums'>Date</th>
                        <th className='px-4 py-3 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((s) => {
                        const scorePercentage = s.scorePercentage;
                        const percentile = s.percentile;
                        const date = s.startedAt
                          ? new Date(s.startedAt).toLocaleDateString('en-GB', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Unknown';
                        const minutes = Math.round(s.timeLimitMinutes);

                        const year = extractYearFromVariant(s.paperVariant);
                        const mainTitle = year
                          ? `${s.paperName} ${year}`
                          : `${s.paperName} ${s.paperVariant}`;

                        const sectionInfo =
                          s.selectedSections && s.selectedSections.length > 0
                            ? s.selectedSections.join(', ')
                            : s.sessionName || '—';

                        const iconColor = getPaperTypeColor(s.paperName);
                        const isHighlighted = highlightedSessionId === s.id;

                        return (
                          <tr
                            key={s.id}
                            data-session-id={s.id}
                            onClick={() => handleViewMarkPage(s.id)}
                            className={cn(
                              'cursor-pointer border-b border-border-subtle transition-colors',
                              isHighlighted
                                ? 'bg-accent/15 ring-2 ring-inset ring-accent/40'
                                : 'bg-surface-elevated hover:bg-surface-mid/60',
                            )}
                          >
                            <td className='px-4 py-3'>
                              <div className='flex items-center gap-2'>
                                <div
                                  className='h-8 w-8 shrink-0 rounded-md flex items-center justify-center'
                                  style={{
                                    backgroundColor: desaturateColor(iconColor, 0.3),
                                  }}
                                >
                                  <FileText className='h-4 w-4 text-text' />
                                </div>
                                <span className='font-medium text-text truncate'>
                                  {mainTitle}
                                </span>
                              </div>
                            </td>
                            <td className='max-w-[180px] truncate px-4 py-3 text-text-muted'>
                              {sectionInfo}
                            </td>
                            <td className='px-4 py-3 text-right tabular-nums text-text'>
                              {scorePercentage !== null
                                ? `${scorePercentage.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td className='px-4 py-3 text-right tabular-nums text-text-muted'>
                              {percentile !== null
                                ? `${percentile.toFixed(1)}th`
                                : '—'}
                            </td>
                            <td className='px-4 py-3 text-right tabular-nums text-text-muted'>
                              {minutes}m
                            </td>
                            <td className='px-4 py-3 text-right tabular-nums text-text-muted'>
                              {date}
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <div className='flex items-center justify-end gap-2'>
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewMarkPage(s.id);
                                  }}
                                  className='h-9 rounded-organic-md border border-border bg-surface-mid px-3 text-xs font-semibold text-text transition-colors hover:bg-surface-neutral'
                                >
                                  Mark
                                </button>
                                <button
                                  type='button'
                                  onClick={(e) => handleDeleteSession(s.id, e)}
                                  className='flex h-9 w-9 items-center justify-center rounded-organic-md border border-border bg-surface-mid text-text-muted transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error'
                                  aria-label='Delete session'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className='rounded-organic-lg border border-dashed border-border-subtle bg-surface-mid/50 py-10 text-center text-sm text-text-muted'>
                  No sessions found for the selected filters.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Quick Overview */}
      <div className={sectionShell}>
        <button
          type='button'
          onClick={() => toggleSection('overview')}
          className='group mb-6 flex w-full items-center justify-between text-left'
        >
          <div>
            <h2 className='font-heading text-xl font-bold tracking-tight text-text transition-colors sm:text-2xl'>
              Quick Overview
            </h2>
            <p className='mt-1 text-sm text-text-muted'>
              Your performance at a glance
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text',
              collapsedSections.has('overview') && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {!collapsedSections.has('overview') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='overflow-hidden'
            >
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <div className='relative overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-1'>
                    Average Score
                  </div>
                  <div className='text-2xl font-bold text-text leading-none'>
                    {Math.round(analytics.averageScore)}%
                  </div>
                </div>
                <div className='relative overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-1'>
                    Sessions Completed
                  </div>
                  <div className='text-2xl font-bold text-text leading-none'>
                    {analytics.totalSessions}
                  </div>
                </div>
                <div className='relative overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-1'>
                    Avg Time
                  </div>
                  <div className='text-2xl font-bold text-text leading-none'>
                    {Math.round(analytics.averageTime)} min
                  </div>
                </div>
                <div className='relative overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-1'>
                    Sections Practiced
                  </div>
                  <div className='text-2xl font-bold text-text leading-none'>
                    {sectionsPracticed}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Performance Trends */}
      <div className={sectionShell}>
        <button
          type='button'
          onClick={() => toggleSection('performance')}
          className='group mb-6 flex w-full items-center justify-between text-left'
        >
          <div>
            <h2 className='font-heading text-xl font-bold tracking-tight text-text transition-colors sm:text-2xl'>
              Performance Trends
            </h2>
            <p className='mt-1 text-sm text-text-muted'>
              Track your percentile progression over time
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text',
              collapsedSections.has('performance') && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {!collapsedSections.has('performance') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='overflow-hidden'
            >
              {/* Filter dropdowns */}
              <div className='mb-6 flex flex-wrap items-center gap-3'>
                <div className='relative' ref={topicDropdownRef}>
                  <button
                    type='button'
                    onClick={() => {
                      setTopicDropdownOpen(!topicDropdownOpen);
                      setPaperTypeDropdownOpen(false);
                    }}
                    className='flex h-10 min-w-[140px] cursor-pointer items-center justify-between rounded-organic-md bg-surface-mid pl-4 pr-10 text-sm text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'
                  >
                    <span className='truncate text-left'>
                      {selectedTopics.length === 0
                        ? 'By Topic'
                        : `${selectedTopics.length} selected`}
                    </span>
                    <ChevronDown
                      className={cn(
                        'pointer-events-none absolute right-3 h-4 w-4 text-text-muted transition-transform',
                        topicDropdownOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {topicDropdownOpen && (
                      <>
                        <div
                          className='fixed inset-0 z-40'
                          onClick={() => setTopicDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className='absolute top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-organic-md bg-surface-mid shadow-2xl'
                        >
                          <div className='max-h-60 overflow-y-auto py-1'>
                            {[
                              'Math 1',
                              'Math 2',
                              'All maths',
                              'Physics',
                              'Chemistry',
                              'Biology',
                            ].map((topic) => (
                              <button
                                key={topic}
                                type='button'
                                onClick={() => {
                                  setSelectedTopics((prev) =>
                                    prev.includes(topic)
                                      ? prev.filter((t) => t !== topic)
                                      : [...prev, topic],
                                  );
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                                  selectedTopics.includes(topic)
                                    ? 'bg-surface-neutral text-text'
                                    : 'text-text-muted hover:bg-surface-neutral hover:text-text',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-4 w-4 items-center justify-center rounded border-2',
                                    selectedTopics.includes(topic)
                                      ? 'border-accent bg-accent'
                                      : 'border-border',
                                  )}
                                >
                                  {selectedTopics.includes(topic) && (
                                    <div className='h-2 w-2 rounded-sm bg-background' />
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

                <div className='relative' ref={paperTypeDropdownRef}>
                  <button
                    type='button'
                    onClick={() => {
                      setPaperTypeDropdownOpen(!paperTypeDropdownOpen);
                      setTopicDropdownOpen(false);
                    }}
                    className='flex h-10 min-w-[140px] cursor-pointer items-center justify-between rounded-organic-md bg-surface-mid pl-4 pr-10 text-sm text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'
                  >
                    <span className='truncate text-left'>
                      {selectedPaperTypes.length === 0
                        ? 'By Paper Type'
                        : `${selectedPaperTypes.length} selected`}
                    </span>
                    <ChevronDown
                      className={cn(
                        'pointer-events-none absolute right-3 h-4 w-4 text-text-muted transition-transform',
                        paperTypeDropdownOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {paperTypeDropdownOpen && (
                      <>
                        <div
                          className='fixed inset-0 z-40'
                          onClick={() => setPaperTypeDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className='absolute top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-organic-md bg-surface-mid shadow-2xl'
                        >
                          <div className='max-h-60 overflow-y-auto py-1'>
                            {(
                              [
                                'TMUA',
                                'ESAT',
                                'NSAA',
                                'ENGAA',
                                'PAT',
                                'MAT',
                                'OTHER',
                              ] as PaperType[]
                            ).map((paperType) => (
                              <button
                                key={paperType}
                                type='button'
                                onClick={() => {
                                  setSelectedPaperTypes((prev) =>
                                    prev.includes(paperType)
                                      ? prev.filter((t) => t !== paperType)
                                      : [...prev, paperType],
                                  );
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                                  selectedPaperTypes.includes(paperType)
                                    ? 'bg-surface-neutral text-text'
                                    : 'text-text-muted hover:bg-surface-neutral hover:text-text',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-4 w-4 items-center justify-center rounded border-2',
                                    selectedPaperTypes.includes(paperType)
                                      ? 'border-accent bg-accent'
                                      : 'border-border',
                                  )}
                                >
                                  {selectedPaperTypes.includes(paperType) && (
                                    <div className='h-2 w-2 rounded-sm bg-background' />
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
                  filterMode='all'
                  selectedFilters={[]}
                />
              ) : (
                <div className='flex h-64 items-center justify-center rounded-organic-md border border-dashed border-border-subtle bg-surface-mid'>
                  <p className='text-sm text-text-muted'>No trend data available</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Mistake Analysis */}
      <div className={sectionShell}>
        <button
          type='button'
          onClick={() => toggleSection('mistakes')}
          className='group mb-6 flex w-full items-center justify-between text-left'
        >
          <div>
            <h2 className='font-heading text-xl font-bold tracking-tight text-text transition-colors sm:text-2xl'>
              Mistake Analysis
            </h2>
            <p className='mt-1 text-sm text-text-muted'>
              Common mistake patterns across all sessions
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text',
              collapsedSections.has('mistakes') && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {!collapsedSections.has('mistakes') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='overflow-hidden'
            >
              <MistakeChart mistakeTags={aggregatedMistakeTags} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <>
            <div
              className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50'
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='fixed inset-0 z-50 flex items-center justify-center p-4'
            >
              <div
                className='bg-surface rounded-organic-lg border border-border shadow-modal-card max-w-md w-full p-6'
                onClick={(e) => e.stopPropagation()}
              >
                <div className='flex items-start gap-4 mb-6'>
                  <div className='flex-shrink-0 w-12 h-12 rounded-full bg-error/15 flex items-center justify-center'>
                    <AlertTriangle className='w-6 h-6 text-error' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold text-text mb-2'>
                      Clear All Session History?
                    </h3>
                    <p className='text-sm text-text-muted'>
                      This will permanently delete all {sessions.length} session
                      {sessions.length !== 1 ? 's' : ''} from your history. This
                      action cannot be undone.
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setShowClearConfirm(false)}
                    className='flex-shrink-0 p-1 rounded-lg hover:bg-surface-elevated text-text-subtle hover:text-text transition-colors'
                  >
                    <X className='w-5 h-5' />
                  </button>
                </div>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={() => setShowClearConfirm(false)}
                    disabled={isClearing}
                    className='px-4 py-2 rounded-organic-md bg-surface-mid hover:bg-surface-neutral text-text-muted text-sm font-medium transition-colors disabled:opacity-50'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={handleClearAllSessions}
                    disabled={isClearing}
                    className='flex items-center gap-2 px-4 py-2 rounded-organic-md bg-error/15 hover:bg-error/25 text-error text-sm font-medium transition-colors disabled:opacity-50'
                  >
                    {isClearing ? (
                      <>
                        <LoadingSpinner size='sm' />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className='w-4 h-4' />
                        Clear All
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Container>
  );
}
