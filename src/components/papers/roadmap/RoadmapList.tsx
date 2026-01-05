/**
 * RoadmapList - Vertical list of stage cards with timeline connections
 * Similar to language learning app lesson list
 */

"use client";

import { useEffect, useRef, useState } from "react";
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
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  onNodePositionsUpdate?: (positions: number[]) => void;
  timelineNodePositions?: number[]; // Y positions of timeline nodes for connector lines
}

export function RoadmapList({
  nodes,
  completionData,
  onStartSession,
  onNodePositionsUpdate,
  timelineNodePositions = [],
}: RoadmapListProps) {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callbackRef = useRef(onNodePositionsUpdate);
  const rafRef = useRef<number | null>(null);

  // Refs for auto-scroll management
  const scrollRafRef = useRef<number | null>(null);
  const hasScrolledRef = useRef(false);
  const abortScrollRef = useRef<(() => void) | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onNodePositionsUpdate;
  }, [onNodePositionsUpdate]);

  // Measure card positions and update timeline
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
            const cardTop = cardRect.top;
            const cardHeight = cardRect.height;
            // Calculate center position relative to container
            const cardCenter = cardTop - containerTop + (cardHeight / 2);
            positions.push(cardCenter);
          }
        });

        if (positions.length > 0 && callbackRef.current) {
          callbackRef.current(positions);
        }
      });
    };

    // Initial measurement after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updatePositions();
    }, 100);

    // Update on resize and scroll (throttled)
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

    // Use ResizeObserver to detect card height changes
    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    // Observe refs after they're set (use a small delay)
    const observeRefs = () => {
      cardRefs.current.forEach((ref) => {
        if (ref) resizeObserver.observe(ref);
      });
    };

    const observeTimeoutId = setTimeout(observeRefs, 150);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(observeTimeoutId);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener("resize", throttledUpdate);
      window.removeEventListener("scroll", throttledUpdate);
      resizeObserver.disconnect();
    };
  }, [nodes.length]);

  // Auto-scroll effect - runs when nodes are first available
  useEffect(() => {
    // Only proceed if nodes are available and we haven't scrolled yet
    if (nodes.length === 0 || hasScrolledRef.current) return;

    // TEST MODE: Hardcoded target to match RoadmapTimeline
    const TEST_MODE = true;
    const targetIndex = TEST_MODE ? 10 : nodes.findIndex(n => n.isCurrent) !== -1 ? nodes.findIndex(n => n.isCurrent) : 0;

    if (targetIndex < 0) return;

    // Delay slightly to let the page settle before starting the cinematic push
    const startDelay = 300;

    const timeoutId = setTimeout(() => {
      if (hasScrolledRef.current) return;

      const targetCard = cardRefs.current[targetIndex];
      if (!targetCard) return;

      // Mark as started
      hasScrolledRef.current = true;

      // Kill legacy animations
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      // Calculate the final scroll destination to center the target card
      const initialScrollY = window.scrollY;
      const targetRect = targetCard.getBoundingClientRect();
      const targetCenterY = initialScrollY + targetRect.top + (targetRect.height / 2);

      const finalTargetY = Math.max(0, targetCenterY - (window.innerHeight / 2));
      const scrollDistance = finalTargetY - initialScrollY;

      // We want a slow, graceful push
      const duration = 3500;
      let startTime: number | null = null;

      // Bezier ease for premium feel
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const cleanup = () => {
        if (scrollRafRef.current) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
        window.removeEventListener("wheel", abortScroll);
        window.removeEventListener("touchmove", abortScroll);
        window.removeEventListener("keydown", abortScroll);
        abortScrollRef.current = null;
      };

      const abortScroll = () => {
        cleanup();
      };

      abortScrollRef.current = abortScroll;

      window.addEventListener("wheel", abortScroll, { passive: true });
      window.addEventListener("touchmove", abortScroll, { passive: true });
      window.addEventListener("keydown", abortScroll, { passive: true });

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeInOutCubic(progress);

        // Interpolate directly to avoid "stuck at top"
        const currentY = initialScrollY + (scrollDistance * easeProgress);
        window.scrollTo(0, currentY);

        if (progress < 1) {
          scrollRafRef.current = requestAnimationFrame(step);
        } else {
          cleanup();
        }
      };

      scrollRafRef.current = requestAnimationFrame(step);
    }, startDelay);

    return () => {
      clearTimeout(timeoutId);
      if (abortScrollRef.current) {
        abortScrollRef.current();
      }
    };
  }, [nodes.length > 0]);

  // Initialize refs array to match nodes length
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, nodes.length);
  }, [nodes.length]);

  return (
    <div ref={containerRef} className="w-full space-y-4 relative overflow-x-hidden">
      {nodes.map((node, index) => {
        const stageCompletionData =
          completionData.get(node.stage.id)?.parts || new Map();
        const timelineNodeY = timelineNodePositions[index];

        return (
          <div
            key={node.stage.id}
            ref={(el) => {
              if (el) {
                cardRefs.current[index] = el;
              } else {
                // Clean up if element is removed
                const idx = cardRefs.current.indexOf(el);
                if (idx >= 0) {
                  cardRefs.current[idx] = null;
                }
              }
            }}
            className="relative"
            style={{ padding: node.isCurrent ? "0 1%" : "0" }}
          >
            <StageListCard
              stage={node.stage}
              index={index}
              completedCount={node.completedCount}
              totalCount={node.totalCount}
              isUnlocked={node.isUnlocked}
              isCurrent={node.isCurrent}
              isCompleted={node.isCompleted}
              isExpanded={expandedStageId === node.stage.id}
              onToggleExpand={() => setExpandedStageId(expandedStageId === node.stage.id ? null : node.stage.id)}
              completionData={stageCompletionData}
              onStartSession={onStartSession}
              timelineNodeY={timelineNodeY}
            />
          </div>
        );
      })}
    </div>
  );
}
