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
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandNavLockup } from '@/components/brand/BrandNavLockup';
import { APP_NAME } from '@/config/brand';
import { getSectionColor } from '@/config/colors';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaperSessionStore } from '@/store/paperSessionStore';

const MARK_SAVE_HINT_KEY = 'papers.mark.saveLeaveHintSeen';

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
  const [hasSeenSaveHint, setHasSeenSaveHint] = useState<boolean | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | 'end' | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(
    null,
  );

  const showNodeTooltip = (node: number | 'end', el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setHoveredNode(node);
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  };

  const hideNodeTooltip = () => {
    setHoveredNode(null);
    setTooltipPos(null);
  };

  useEffect(() => {
    try {
      setHasSeenSaveHint(localStorage.getItem(MARK_SAVE_HINT_KEY) === '1');
    } catch {
      setHasSeenSaveHint(false);
    }
  }, []);

  const dismissSaveHint = () => {
    try {
      localStorage.setItem(MARK_SAVE_HINT_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setHasSeenSaveHint(true);
  };

  const showSaveHint =
    hasSeenSaveHint === false &&
    isOnMarkPage &&
    isMarkingInfo &&
    !isSaving;

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
      const firstQ =
        sectionQuestions?.[0] ??
        (sectionQuestions === undefined && questions.length > 0
          ? questions.find(
              (q) =>
                (q.partName?.trim() || section) === section ||
                selectedSections[index] === section,
            )
          : undefined);
      return {
        partLabel: formatPartLabel(firstQ?.partLetter),
        subject: firstQ?.partName?.trim() || section,
        section,
        color: getSectionColor(firstQ?.partName?.trim() || section),
      };
    });
  }, [selectedSections, allSectionsQuestions, questions]);

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
    if (isOnMarkPage) dismissSaveHint();
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
    <nav className={cn(outerClass, 'overflow-visible')} aria-label='Session progress'>
      {hoveredLabel &&
        tooltipPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className='pointer-events-none fixed z-[200] -translate-x-1/2 whitespace-nowrap rounded-organic-md border border-border-subtle bg-surface-elevated px-2.5 py-1.5 shadow-bar-floating'
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
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
          </div>,
          document.body,
        )}

      <div className='flex h-12 w-full items-center gap-3 overflow-visible px-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          className='group interaction-scale inline-flex shrink-0 items-center'
          aria-label={APP_NAME}
        >
          <BrandNavLockup />
        </Link>

        <div className='relative min-w-0 flex-1 overflow-visible'>
          <div className='relative h-6 w-full overflow-visible'>
            <div className='absolute inset-x-0 top-3 h-0'>
              <div className='pointer-events-none absolute -top-0.5 left-0 right-0 h-[5px] overflow-hidden rounded-full bg-accent/20' />

              {progressSegments.map((segment, index) => (
                <div
                  key={`segment-${index}`}
                  className='pointer-events-none absolute rounded-full bg-accent transition-all duration-500 ease-out'
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
                    className='absolute z-10 flex flex-col items-center'
                    style={{
                      left: `${nodePosition}%`,
                      top: '-14px',
                      transform: 'translateX(-50%)',
                    }}
                    onMouseEnter={(e) => showNodeTooltip(index, e.currentTarget)}
                    onMouseLeave={hideNodeTooltip}
                    onFocus={(e) => showNodeTooltip(index, e.currentTarget)}
                    onBlur={hideNodeTooltip}
                    aria-label={`${nodeLabels[index]?.partLabel ?? 'Part'}: ${nodeLabels[index]?.subject ?? section}`}
                  >
                    <span className='flex h-7 w-7 items-center justify-center'>
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full border-2 transition-all',
                          isCompleted
                            ? 'border-accent bg-accent'
                            : isCurrent && !isOnInstructionPage
                              ? 'border-accent bg-accent'
                              : 'border-accent/35 bg-accent/20',
                        )}
                      />
                    </span>
                  </button>
                );
              })}

              <button
                type='button'
                className='absolute z-10 flex flex-col items-center'
                style={{
                  left: '100%',
                  top: '-14px',
                  transform: 'translateX(-50%)',
                }}
                onMouseEnter={(e) => showNodeTooltip('end', e.currentTarget)}
                onMouseLeave={hideNodeTooltip}
                onFocus={(e) => showNodeTooltip('end', e.currentTarget)}
                onBlur={hideNodeTooltip}
                aria-label={`${endNodeLabel.partLabel}: ${endNodeLabel.subject}`}
              >
                <span className='flex h-7 w-7 items-center justify-center'>
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
                        ? 'border-accent bg-accent'
                        : 'border-accent/35 bg-accent/20',
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className='relative flex shrink-0 items-center'>
          {showSaveHint && (
            <div
              className='pointer-events-none absolute right-0 bottom-full z-30 mb-2 sm:bottom-auto sm:right-full sm:top-1/2 sm:mb-0 sm:mr-3 sm:-translate-y-1/2'
              role='status'
              aria-live='polite'
            >
              <div className='animate-gentle-slide relative max-w-[min(16rem,calc(100vw-2rem))] rounded-organic-md border border-border-subtle bg-surface-elevated px-3 py-2 text-xs font-medium leading-snug text-text shadow-bar-floating sm:max-w-none sm:whitespace-nowrap'>
                Press Save to keep your results &amp; leave
                <span
                  className='absolute -bottom-1 right-4 h-2 w-2 rotate-45 border-b border-r border-border-subtle bg-surface-elevated sm:-right-1 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:border-b-0 sm:border-l-0 sm:border-r sm:border-t'
                  aria-hidden
                />
              </div>
            </div>
          )}

          <div className='relative'>
            {showSaveHint && (
              <>
                <span className='pointer-events-none absolute -inset-1 animate-ping rounded-lg bg-accent/20' />
                <span className='pointer-events-none absolute -inset-0.5 animate-pulse rounded-lg ring-2 ring-accent/40' />
              </>
            )}
            <button
              type='button'
              onClick={() => void handleSaveAndContinue()}
              disabled={isSaving}
              className={cn(
                iconBtnClass,
                'relative z-10 text-accent hover:bg-accent/15 hover:text-accent',
                showSaveHint && 'animate-pulse-soft bg-accent/15 text-accent',
                isSaving && 'cursor-not-allowed opacity-60',
              )}
              title={isSaving ? 'Saving…' : 'Save & leave'}
              aria-label={
                isSaving
                  ? 'Saving session'
                  : showSaveHint
                    ? 'Save and leave — keeps your results'
                    : 'Save and leave'
              }
            >
              {isSaving ? (
                <Loader2 className='h-[18px] w-[18px] animate-spin' strokeWidth={2.2} />
              ) : (
                <Save className='h-[18px] w-[18px]' strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
