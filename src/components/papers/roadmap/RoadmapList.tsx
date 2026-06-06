/**
 * RoadmapList - Vertical list of stage cards with timeline connections
 * Similar to language learning app lesson list
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import { StageListCard } from "./StageListCard";

interface TimelineNode {
  stage: RoadmapStage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  completedCount: number;
  totalCount: number;
}

interface RoadmapListProps {
  nodes: TimelineNode[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  completionLoading: boolean;
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  onNodePositionsUpdate?: (positions: number[]) => void;
  timelineNodePositions?: number[];
}

const SCROLL_DURATION_MS = 5800;
const SCROLL_START_DELAY_MS = 700;

function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

export function RoadmapList({
  nodes,
  completionData,
  completionLoading,
  onStartSession,
  onNodePositionsUpdate,
  timelineNodePositions = [],
}: RoadmapListProps) {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [listRevealed, setListRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callbackRef = useRef(onNodePositionsUpdate);
  const rafRef = useRef<number | null>(null);
  const positionFlushRafRef = useRef<number | null>(null);
  const pendingPositionsRef = useRef<number[] | null>(null);

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

  useEffect(() => {
    const updatePositions = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const containerTop = containerRef.current.getBoundingClientRect().top;
        const positions: number[] = [];

        cardRefs.current.forEach((cardRef) => {
          if (cardRef) {
            const cardRect = cardRef.getBoundingClientRect();
            const cardCenter =
              cardRect.top - containerTop + cardRect.height / 2;
            positions.push(cardCenter);
          }
        });

        if (positions.length > 0) {
          schedulePositionFlush(positions);
        }
      });
    };

    const schedulePositionFlush = (positions: number[]) => {
      pendingPositionsRef.current = positions;
      if (positionFlushRafRef.current !== null) return;

      positionFlushRafRef.current = requestAnimationFrame(() => {
        positionFlushRafRef.current = null;
        const next = pendingPositionsRef.current;
        pendingPositionsRef.current = null;
        if (next && callbackRef.current) {
          callbackRef.current(next);
        }
      });
    };

    const timeoutId = setTimeout(updatePositions, 100);

    let ticking = false;
    const throttledUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updatePositions();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("resize", throttledUpdate, { passive: true });
    window.addEventListener("scroll", throttledUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    const observeTimeoutId = setTimeout(() => {
      cardRefs.current.forEach((ref) => {
        if (ref) resizeObserver.observe(ref);
      });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(observeTimeoutId);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (positionFlushRafRef.current) {
        cancelAnimationFrame(positionFlushRafRef.current);
      }
      window.removeEventListener("resize", throttledUpdate);
      window.removeEventListener("scroll", throttledUpdate);
      resizeObserver.disconnect();
    };
  }, [nodes.length, expandedStageId]);

  // After completion loads: scroll to current stage, then expand it
  useEffect(() => {
    if (completionLoading || nodes.length === 0 || hasRevealedRef.current) {
      return;
    }

    const targetIndex = nodes.findIndex((n) => n.isCurrent && n.isUnlocked);
    if (targetIndex < 0) {
      hasRevealedRef.current = true;
      return;
    }

    const targetStageId = nodes[targetIndex].stage.id;

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
        const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
        const easeProgress = easeInOutQuint(progress);
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
    }, SCROLL_START_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      if (finishScrollRef.current) {
        finishScrollRef.current(false);
      }
    };
  }, [completionLoading, nodes]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, nodes.length);
  }, [nodes.length]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 w-full space-y-3 overflow-visible"
    >
      {nodes.map((node, index) => {
        const stageCompletionData =
          completionData.get(node.stage.id)?.parts || new Map();
        const timelineNodeY = timelineNodePositions[index];

        return (
          <motion.div
            key={node.stage.id}
            data-stage-id={node.stage.id}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="relative"
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
              isExpanded={expandedStageId === node.stage.id}
              onToggleExpand={() =>
                setExpandedStageId(
                  expandedStageId === node.stage.id ? null : node.stage.id,
                )
              }
              completionData={stageCompletionData}
              onStartSession={onStartSession}
              timelineNodeY={timelineNodeY}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
