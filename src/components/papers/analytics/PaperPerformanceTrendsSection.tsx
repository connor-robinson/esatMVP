'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PaperType } from '@/types/papers';
import type { EnrichedPaperSession } from '@/lib/papers/analytics';
import { cn } from '@/lib/utils';
import { sectionShell } from './styles';
import { PaperSessionTrendsChart } from './PaperSessionTrendsChart';

const TOPIC_OPTIONS = [
  'Math 1',
  'Math 2',
  'All maths',
  'Physics',
  'Chemistry',
  'Biology',
] as const;

const PAPER_TYPE_OPTIONS: PaperType[] = [
  'TMUA',
  'ESAT',
  'NSAA',
  'ENGAA',
  'PAT',
  'MAT',
  'OTHER',
];

interface PaperPerformanceTrendsSectionProps {
  sessions: EnrichedPaperSession[];
  selectedTopics: string[];
  onSelectedTopicsChange: (topics: string[]) => void;
  selectedPaperTypes: PaperType[];
  onSelectedPaperTypesChange: (types: PaperType[]) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PaperPerformanceTrendsSection({
  sessions,
  selectedTopics,
  onSelectedTopicsChange,
  selectedPaperTypes,
  onSelectedPaperTypesChange,
  isCollapsed = false,
  onToggleCollapse,
}: PaperPerformanceTrendsSectionProps) {
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

  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Performance Trends
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Accuracy and percentile by session. Dots are sessions, lines are the trend
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-6 w-6 shrink-0 text-text-muted transition-transform duration-200 group-hover:text-text',
            isCollapsed && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="relative" ref={topicDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setTopicDropdownOpen(!topicDropdownOpen);
                    setPaperTypeDropdownOpen(false);
                  }}
                  className="flex h-10 min-w-[140px] cursor-pointer items-center justify-between rounded-organic-md border-0 bg-surface-dark py-2.5 pl-3 pr-9 text-sm font-medium text-text transition-colors hover:opacity-90 focus-visible:outline-none dark:bg-surface-neutral"
                >
                  <span className="truncate text-left">
                    {selectedTopics.length === 0
                      ? 'By topic'
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
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-organic-md bg-surface-mid shadow-2xl"
                    >
                      <div className="max-h-60 overflow-y-auto py-1">
                        {TOPIC_OPTIONS.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              onSelectedTopicsChange(
                                selectedTopics.includes(topic)
                                  ? selectedTopics.filter((t) => t !== topic)
                                  : [...selectedTopics, topic],
                              );
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                              selectedTopics.includes(topic)
                                ? 'bg-surface-neutral text-text'
                                : 'text-text-muted hover:bg-surface-neutral hover:text-text',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
                                selectedTopics.includes(topic)
                                  ? 'border-accent bg-accent'
                                  : 'border-border-subtle',
                              )}
                            >
                              {selectedTopics.includes(topic) && (
                                <span className="h-2 w-2 rounded-sm bg-background" />
                              )}
                            </span>
                            {topic}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={paperTypeDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setPaperTypeDropdownOpen(!paperTypeDropdownOpen);
                    setTopicDropdownOpen(false);
                  }}
                  className="flex h-10 min-w-[140px] cursor-pointer items-center justify-between rounded-organic-md border-0 bg-surface-dark py-2.5 pl-3 pr-9 text-sm font-medium text-text transition-colors hover:opacity-90 focus-visible:outline-none dark:bg-surface-neutral"
                >
                  <span className="truncate text-left">
                    {selectedPaperTypes.length === 0
                      ? 'By paper type'
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
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-organic-md bg-surface-mid shadow-2xl"
                    >
                      <div className="max-h-60 overflow-y-auto py-1">
                        {PAPER_TYPE_OPTIONS.map((paperType) => (
                          <button
                            key={paperType}
                            type="button"
                            onClick={() => {
                              onSelectedPaperTypesChange(
                                selectedPaperTypes.includes(paperType)
                                  ? selectedPaperTypes.filter(
                                      (t) => t !== paperType,
                                    )
                                  : [...selectedPaperTypes, paperType],
                              );
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                              selectedPaperTypes.includes(paperType)
                                ? 'bg-surface-neutral text-text'
                                : 'text-text-muted hover:bg-surface-neutral hover:text-text',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
                                selectedPaperTypes.includes(paperType)
                                  ? 'border-accent bg-accent'
                                  : 'border-border-subtle',
                              )}
                            >
                              {selectedPaperTypes.includes(paperType) && (
                                <span className="h-2 w-2 rounded-sm bg-background" />
                              )}
                            </span>
                            {paperType}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <PaperSessionTrendsChart sessions={sessions} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
