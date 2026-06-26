/**
 * Session Progress Bar Component
 *
 * Top bar during active paper sessions:
 * - Brand logo (always visible)
 * - Full-width section timeline
 * - Current part / section info
 * - Save & leave
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandNavLockup } from '@/components/brand/BrandNavLockup';
import { APP_NAME } from '@/config/brand';
import { getSectionColor } from '@/config/colors';
import { BookmarkCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaperSessionStore } from '@/store/paperSessionStore';

interface SessionProgressBarProps {
  /** When true, render below the main navbar (hybrid fullscreen layout). */
  embedded?: boolean;
}

function formatPartLabel(partLetter: string | undefined | null): string {
  if (!partLetter?.trim()) return 'Part';
  const raw = partLetter.trim();
  const upper = raw.toUpperCase();
  if (upper.startsWith('PART ')) {
    const rest = raw.slice(5).trim();
    const letter = rest.charAt(0);
    return letter ? `Part ${letter.toUpperCase()}` : raw;
  }
  if (/^[A-Z]$/i.test(raw)) return `Part ${raw.toUpperCase()}`;
  return raw;
}

export function SessionProgressBar({
  embedded = false,
}: SessionProgressBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    sessionId,
    sessionName,
    paperName,
    paperVariant,
    selectedSections,
    currentSectionIndex,
    currentQuestionIndex,
    sectionInstructionTimer,
    isPaused,
    allSectionsQuestions,
    questions,
    isMarkingInfo,
    paperFullscreenShowMainNavbar,
    finishMarkSession,
    persistSessionToServer,
    pauseSession,
  } = usePaperSessionStore();

  const isOnMarkPage = pathname.startsWith('/past-papers/mark');
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<number | 'end' | null>(null);

  const [docFullscreen, setDocFullscreen] = useState(false);
  useEffect(() => {
    if (!embedded) return;
    const sync = () => {
      const d = document as Document & {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
      };
      setDocFullscreen(!!(d.fullscreenElement ?? d.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener(
      'webkitfullscreenchange',
      sync as EventListener,
    );
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener(
        'webkitfullscreenchange',
        sync as EventListener,
      );
    };
  }, [embedded]);

  const totalSections = selectedSections.length;
  const isOnInstructionPage =
    sectionInstructionTimer !== null && sectionInstructionTimer > 0;

  const paperDisplayName = useMemo((): string => {
    if (!paperName) return 'Custom';

    const yearMatch = paperVariant?.match(/^(\d{4})-/);
    const year = yearMatch ? yearMatch[1] : null;

    const isCustom =
      sessionName &&
      (sessionName.includes('Custom') ||
        sessionName.includes('custom') ||
        !sessionName.match(/\d{4}/));

    if (isCustom) return 'Custom';
    return year ? `${paperName} ${year}` : paperName;
  }, [paperName, paperVariant, sessionName]);

  const nodeLabels = useMemo(() => {
    return selectedSections.map((section, index) => {
      const sectionQuestions = allSectionsQuestions?.[index];
      const firstQ = sectionQuestions?.[0];
      return {
        partLabel: formatPartLabel(firstQ?.partLetter),
        subject: firstQ?.partName?.trim() || section,
        section,
        color: getSectionColor(section),
      };
    });
  }, [selectedSections, allSectionsQuestions]);

  const endNodeLabel = useMemo(() => {
    if (isOnMarkPage) {
      return {
        partLabel: 'Review',
        subject: 'Mark session',
        color: getSectionColor('Mathematics'),
      };
    }
    if (isMarkingInfo) {
      return {
        partLabel: 'Complete',
        subject: 'Ready to mark',
        color: getSectionColor('Mathematics'),
      };
    }
    return {
      partLabel: 'Finish',
      subject: 'End of paper',
      color: getSectionColor('Mathematics'),
    };
  }, [isOnMarkPage, isMarkingInfo]);

  const hoveredLabel = useMemo(() => {
    if (hoveredNode === null) return null;
    if (hoveredNode === 'end') return endNodeLabel;
    return nodeLabels[hoveredNode] ?? null;
  }, [hoveredNode, nodeLabels, endNodeLabel]);

  const hoveredPosition =
    hoveredNode === null
      ? null
      : hoveredNode === 'end'
        ? 100
        : totalSections > 0
          ? (hoveredNode / totalSections) * 100
          : 0;

  if (!sessionId) return null;

  const calculateSectionProgress = (sectionIndex: number): number => {
    if (isOnInstructionPage) return 0;

    if (!allSectionsQuestions || allSectionsQuestions.length <= sectionIndex) {
      return 0;
    }

    const sectionQuestions = allSectionsQuestions[sectionIndex] || [];
    if (sectionQuestions.length === 0) return 0;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return 0;

    if (sectionIndex === currentSectionIndex) {
      const currentQuestionInSection = sectionQuestions.findIndex(
        (q) => q.id === currentQuestion.id,
      );
      if (currentQuestionInSection >= 0) {
        return Math.min(
          1,
          Math.max(
            0,
            (currentQuestionInSection + 1) / sectionQuestions.length,
          ),
        );
      }
    }

    if (sectionIndex < currentSectionIndex) return 1.0;
    return 0;
  };

  const getProgressSegments = (): Array<{ start: number; end: number }> => {
    if (isMarkingInfo) return [{ start: 0, end: 100 }];

    const segments: Array<{ start: number; end: number }> = [];
    const filledNodes: number[] = [];

    for (let i = 0; i < selectedSections.length; i++) {
      const isCompleted = i < currentSectionIndex || isMarkingInfo;
      const isCurrent = i === currentSectionIndex;
      const isFilled = isCompleted || (isCurrent && !isOnInstructionPage);
      if (isFilled) filledNodes.push(i);
    }

    if (filledNodes.length === 0) return [];

    for (let i = 0; i < filledNodes.length - 1; i++) {
      const startNodeIndex = filledNodes[i];
      const endNodeIndex = filledNodes[i + 1];
      segments.push({
        start: (startNodeIndex / totalSections) * 100,
        end: (endNodeIndex / totalSections) * 100,
      });
    }

    if (isOnInstructionPage && currentSectionIndex > 0) {
      segments.push({
        start: ((currentSectionIndex - 1) / totalSections) * 100,
        end: (currentSectionIndex / totalSections) * 100,
      });
    }

    const lastFilledIndex = filledNodes[filledNodes.length - 1];
    if (lastFilledIndex === currentSectionIndex && !isOnInstructionPage) {
      const sectionProgress = calculateSectionProgress(currentSectionIndex);
      const sectionStartPosition = (currentSectionIndex / totalSections) * 100;
      const nextNodePosition =
        currentSectionIndex < totalSections - 1
          ? ((currentSectionIndex + 1) / totalSections) * 100
          : 100;
      const sectionWidth = nextNodePosition - sectionStartPosition;
      const isLastSection = currentSectionIndex >= totalSections - 1;
      const endPosition =
        isLastSection && sectionProgress >= 1.0
          ? 100
          : sectionStartPosition + sectionProgress * sectionWidth;

      segments.push({ start: sectionStartPosition, end: endPosition });
    }

    return segments;
  };

  const progressSegments = getProgressSegments();

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      if (isMarkingInfo) {
        const sessionIdToHighlight = await finishMarkSession();
        if (sessionIdToHighlight) {
          router.push(`/past-papers/analytics?highlight=${sessionIdToHighlight}`);
        } else {
          router.push('/past-papers/analytics');
        }
        return;
      }

      if (!isPaused) pauseSession();
      await persistSessionToServer({ immediate: true });
      router.push('/past-papers/library');
    } catch (error) {
      console.error('[SessionProgressBar] Failed to save session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const mainNavStripVisible =
    docFullscreen && paperFullscreenShowMainNavbar;
  const outerClass = embedded
    ? mainNavStripVisible
      ? 'sticky top-16 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md'
      : 'sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md'
    : 'sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md';

  const iconBtnClass =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-text';

  return (
    <nav className={outerClass} aria-label='Session progress'>
      <div className='flex h-12 w-full items-center gap-3 px-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          className='group interaction-scale inline-flex shrink-0 items-center'
          aria-label={APP_NAME}
        >
          <BrandNavLockup />
        </Link>

        <div className='relative min-w-0 flex-1'>
          <div className='relative h-6 w-full'>
            {hoveredLabel && hoveredPosition !== null ? (
              <div
                className='pointer-events-none absolute z-50 -translate-x-1/2 whitespace-nowrap rounded-organic-md bg-surface-elevated px-2.5 py-1.5 shadow-lg'
                style={{ left: `${hoveredPosition}%`, top: '-2.75rem' }}
              >
                <div className='flex items-center gap-2'>
                  <span
                    className='rounded-md px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide text-background'
                    style={{ backgroundColor: hoveredLabel.color }}
                  >
                    {hoveredLabel.partLabel}
                  </span>
                  <span className='font-heading text-xs font-semibold text-text'>
                    {hoveredLabel.subject}
                  </span>
                </div>
              </div>
            ) : null}

            <div className='absolute inset-x-0 top-3 h-0'>
              <div className='absolute -top-0.5 left-0 right-0 h-[5px] overflow-hidden rounded-full bg-border-subtle' />

              {progressSegments.map((segment, index) => (
                <div
                  key={`segment-${index}`}
                  className='absolute rounded-full bg-maths transition-all duration-500 ease-out'
                  style={{
                    left: `${segment.start}%`,
                    width: `${segment.end - segment.start}%`,
                    top: '-2.5px',
                    height: '5px',
                  }}
                />
              ))}

              {selectedSections.map((section, index) => {
                const isCompleted = index < currentSectionIndex;
                const isCurrent = index === currentSectionIndex;
                const nodePosition = (index / totalSections) * 100;

                return (
                  <button
                    key={`${section}-${index}`}
                    type='button'
                    className='absolute flex flex-col items-center'
                    style={{
                      left: `${nodePosition}%`,
                      top: '-10px',
                      transform: 'translateX(-50%)',
                    }}
                    onMouseEnter={() => setHoveredNode(index)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onFocus={() => setHoveredNode(index)}
                    onBlur={() => setHoveredNode(null)}
                    aria-label={`${nodeLabels[index]?.partLabel ?? 'Part'}: ${nodeLabels[index]?.subject ?? section}`}
                  >
                    <span className='flex h-5 w-5 items-center justify-center'>
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full border-2 transition-all',
                          isCompleted
                            ? 'border-maths bg-maths'
                            : isCurrent && !isOnInstructionPage
                              ? 'border-maths bg-maths'
                              : 'border-border bg-transparent',
                        )}
                      />
                    </span>
                  </button>
                );
              })}

              <button
                type='button'
                className='absolute flex flex-col items-center'
                style={{
                  left: '100%',
                  top: '-10px',
                  transform: 'translateX(-50%)',
                }}
                onMouseEnter={() => setHoveredNode('end')}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setHoveredNode('end')}
                onBlur={() => setHoveredNode(null)}
                aria-label={`${endNodeLabel.partLabel}: ${endNodeLabel.subject}`}
              >
                <span className='flex h-5 w-5 items-center justify-center'>
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full border-2 transition-all duration-500',
                      (() => {
                        if (isMarkingInfo) return true;
                        if (currentSectionIndex >= totalSections) return true;
                        if (
                          currentSectionIndex >= totalSections - 1 &&
                          allSectionsQuestions &&
                          allSectionsQuestions.length > currentSectionIndex
                        ) {
                          const lastSectionQuestions =
                            allSectionsQuestions[currentSectionIndex] || [];
                          if (lastSectionQuestions.length > 0) {
                            const lastSectionProgress =
                              calculateSectionProgress(currentSectionIndex);
                            if (lastSectionProgress >= 1.0) return true;
                          }
                        }
                        return false;
                      })()
                        ? 'border-maths bg-maths'
                        : 'border-border bg-transparent',
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className='flex shrink-0 items-center'>
          <button
            type='button'
            onClick={() => void handleSaveAndContinue()}
            disabled={isSaving}
            className={cn(
              iconBtnClass,
              'text-maths hover:bg-maths/10 hover:text-maths',
              isSaving && 'cursor-not-allowed opacity-60',
            )}
            title={isSaving ? 'Saving…' : 'Save & leave'}
            aria-label={isSaving ? 'Saving session' : 'Save and leave'}
          >
            {isSaving ? (
              <Loader2 className='h-[18px] w-[18px] animate-spin' strokeWidth={2.2} />
            ) : (
              <BookmarkCheck className='h-[18px] w-[18px]' strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
