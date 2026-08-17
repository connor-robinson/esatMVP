/**
 * RoadmapList - Vertical list of stage cards with timeline connections
 * Similar to language learning app lesson list
 */

"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import type { RoadmapLockReason } from "./StageListCard";
import { StageListCard } from "./StageListCard";
import { ROADMAP_EXPAND_MS } from "./roadmapTimelineLayout";

interface TimelineNode {
  stage: RoadmapStage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  completedCount: number;
  totalCount: number;
  lockReason?: RoadmapLockReason | null;
}

interface RoadmapListProps {
  nodes: TimelineNode[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  completionLoading: boolean;
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  onUnlockStage?: (stageId: string) => void;
  onNodePositionsUpdate?: (positions: number[]) => void;
  timelineNodePositions?: number[];
  /** Sticky timeline column — node Y is measured relative to this while scrolling. */
  timelineAnchorRef?: RefObject<HTMLDivElement | null>;
}

const SCROLL_MIN_MS = 420;
const SCROLL_MAX_MS = 1050;
const SCROLL_MS_PER_PX = 0.5;
const SCROLL_BASE_DELAY_MS = 280;

/** Fast start, gentle stop — matches other roadmap motion. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function scrollDurationForDistance(distancePx: number): number {
  return Math.min(
    SCROLL_MAX_MS,
    Math.max(SCROLL_MIN_MS, Math.abs(distancePx) * SCROLL_MS_PER_PX),
  );
}

export function RoadmapList({
  nodes,
  completionData,
  completionLoading,
  onStartSession,
  onUnlockStage,
  onNodePositionsUpdate,
  timelineNodePositions = [],
  timelineAnchorRef,
}: RoadmapListProps) {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [listRevealed, setListRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callbackRef = useRef(onNodePositionsUpdate);
  const measurePositionsRef = useRef<() => void>(() => {});

  const scrollRafRef = useRef<number | null>(null);
  const hasRevealedRef = useRef(false);
  const isScrollAnimatingRef = useRef(false);
  const expectedScrollYRef = useRef(0);
  const finishScrollRef = useRef<((reveal: boolean) => void) | null>(null);

  useEffect(() => {
    callbackRef.current = onNodePositionsUpdate;
  }, [onNodePositionsUpdate]);

  useEffect(() => {
    if (!completionLoading) {
      setListRevealed(true);
    }
  }, [completionLoading]);

  const measurePositions = useCallback(() => {
    const anchorTop =
      timelineAnchorRef?.current?.getBoundingClientRect().top ??
      containerRef.current?.getBoundingClientRect().top;

    if (anchorTop === undefined) return;

    const positions: number[] = [];

    cardRefs.current.forEach((cardRef) => {
      if (cardRef) {
        const cardRect = cardRef.getBoundingClientRect();
        positions.push(cardRect.top - anchorTop + cardRect.height / 2);
      }
    });

    if (positions.length > 0 && callbackRef.current) {
      callbackRef.current(positions);
    }
  }, [timelineAnchorRef]);

  useEffect(() => {
    measurePositionsRef.current = measurePositions;
  }, [measurePositions]);

  // Stable observers — do not tear down when a card expands.
  useEffect(() => {
    let rafId: number | null = null;

    const scheduleMeasure = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measurePositionsRef.current();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);

    const observeCards = () => {
      resizeObserver.disconnect();
      cardRefs.current.forEach((ref) => {
        if (ref) resizeObserver.observe(ref);
      });
      scheduleMeasure();
    };

    observeCards();
    const deferredObserve = window.setTimeout(observeCards, 200);
    const rafObserve = requestAnimationFrame(() => {
      observeCards();
    });

    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("scroll", scheduleMeasure, { passive: true });

    return () => {
      clearTimeout(deferredObserve);
      cancelAnimationFrame(rafObserve);
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
    };
  }, [nodes.length]);

  // Poll every frame while expand/collapse animates (siblings move without resizing).
  useEffect(() => {
    let rafId: number | null = null;
    const startedAt = performance.now();
    const duration = ROADMAP_EXPAND_MS + 100;

    const tick = (now: number) => {
      measurePositionsRef.current();
      if (now - startedAt < duration) {
        rafId = requestAnimationFrame(tick);
      }
    };

    measurePositionsRef.current();
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [expandedStageId]);

  // After completion loads: scroll to current stage, then expand it
  useEffect(() => {
    if (
      completionLoading ||
      !listRevealed ||
      nodes.length === 0 ||
      hasRevealedRef.current
    ) {
      return;
    }

    const targetIndex = nodes.findIndex((n) => n.isCurrent && n.isUnlocked);
    if (targetIndex < 0) {
      hasRevealedRef.current = true;
      return;
    }

    const targetStageId = nodes[targetIndex].stage.id;
    const scrollStartDelayMs = Math.min(
      900,
      SCROLL_BASE_DELAY_MS + nodes.length * 40,
    );

    const timeoutId = setTimeout(() => {
      if (hasRevealedRef.current) return;

      const targetCard = cardRefs.current[targetIndex];
      if (!targetCard) {
        hasRevealedRef.current = true;
        setExpandedStageId(targetStageId);
        return;
      }

      hasRevealedRef.current = true;

      const initialScrollY = window.scrollY;
      const targetRect = targetCard.getBoundingClientRect();
      const targetCenterY =
        initialScrollY + targetRect.top + targetRect.height / 2;
      const finalTargetY = Math.max(
        0,
        targetCenterY - window.innerHeight / 2,
      );
      const scrollDistance = finalTargetY - initialScrollY;
      const scrollDurationMs = scrollDurationForDistance(scrollDistance);

      if (Math.abs(scrollDistance) < 8) {
        setExpandedStageId(targetStageId);
        return;
      }

      let startTime: number | null = null;
      isScrollAnimatingRef.current = true;
      expectedScrollYRef.current = initialScrollY;

      const removeInterruptListeners = () => {
        window.removeEventListener("wheel", onUserInterrupt);
        window.removeEventListener("touchmove", onUserInterrupt);
        window.removeEventListener("keydown", onUserInterrupt);
        window.removeEventListener("scroll", onScrollWhileAnimating);
      };

      const finishScroll = (reveal: boolean) => {
        if (!isScrollAnimatingRef.current) return;
        isScrollAnimatingRef.current = false;

        if (scrollRafRef.current) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }

        removeInterruptListeners();
        finishScrollRef.current = null;
        window.scrollTo({ top: finalTargetY, behavior: "auto" });
        measurePositionsRef.current();

        if (reveal) {
          requestAnimationFrame(() => {
            setExpandedStageId(targetStageId);
          });
        }
      };

      finishScrollRef.current = finishScroll;

      const onUserInterrupt = () => {
        finishScroll(true);
      };

      const onScrollWhileAnimating = () => {
        if (!isScrollAnimatingRef.current) return;
        if (
          Math.abs(window.scrollY - expectedScrollYRef.current) > 20
        ) {
          finishScroll(true);
        }
      };

      window.addEventListener("wheel", onUserInterrupt, { passive: true });
      window.addEventListener("touchmove", onUserInterrupt, { passive: true });
      window.addEventListener("keydown", onUserInterrupt, { passive: true });
      window.addEventListener("scroll", onScrollWhileAnimating, {
        passive: true,
      });

      const step = (timestamp: number) => {
        if (!isScrollAnimatingRef.current) return;

        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / scrollDurationMs, 1);
        const easeProgress = easeOutCubic(progress);
        const currentY = initialScrollY + scrollDistance * easeProgress;

        expectedScrollYRef.current = currentY;
        window.scrollTo(0, currentY);

        if (progress < 1) {
          scrollRafRef.current = requestAnimationFrame(step);
        } else {
          finishScroll(true);
        }
      };

      scrollRafRef.current = requestAnimationFrame(step);
    }, scrollStartDelayMs);

    return () => {
      clearTimeout(timeoutId);
      if (finishScrollRef.current) {
        finishScrollRef.current(false);
      }
    };
  }, [completionLoading, listRevealed, nodes]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, nodes.length);
  }, [nodes.length]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 w-full min-w-0 space-y-3 overflow-x-clip overflow-y-visible"
    >
      {nodes.map((node, index) => {
        const stageCompletionData =
          completionData.get(node.stage.id)?.parts || new Map();
        const timelineNodeY = timelineNodePositions[index];

        return (
          <motion.div
            key={node.stage.id}
            data-stage-id={node.stage.id}
            className="relative min-w-0"
            initial={{ opacity: 0, y: 14 }}
            animate={
              listRevealed
                ? { opacity: 1, y: 0 }
                : { opacity: 0.35, y: 8 }
            }
            transition={{
              duration: 0.55,
              delay: listRevealed ? index * 0.07 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <StageListCard
              stage={node.stage}
              index={index}
              completedCount={node.completedCount}
              totalCount={node.totalCount}
              isUnlocked={node.isUnlocked}
              lockReason={node.lockReason}
              onUnlockNow={
                node.lockReason === "progression"
                  ? () => onUnlockStage?.(node.stage.id)
                  : undefined
              }
              isExpanded={expandedStageId === node.stage.id}
              onToggleExpand={() =>
                setExpandedStageId(
                  expandedStageId === node.stage.id ? null : node.stage.id,
                )
              }
              completionData={stageCompletionData}
              onStartSession={onStartSession}
              timelineNodeY={timelineNodeY}
              isStageCompleted={node.isCompleted}
              anchorRef={(el) => {
                cardRefs.current[index] = el;
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
