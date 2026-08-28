"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from "react";
import type { ZoomLevel } from "@/lib/pearson/types";

interface PearsonQuestionViewportProps {
  questionKey: string | number;
  zoomLevel: ZoomLevel;
  onViewedToEnd: () => void;
  children: ReactNode;
}

function isScrolledToEnd(el: HTMLElement): boolean {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= 2;
}

/**
 * Scrollable question content. Tracks scroll-to-bottom for Unseen Content gate.
 * Resets scroll position when the question changes.
 */
export function PearsonQuestionViewport({
  questionKey,
  zoomLevel,
  onViewedToEnd,
  children,
}: PearsonQuestionViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el || reportedRef.current) return;
    // Short content that fits without scrolling counts as viewed.
    if (el.scrollHeight <= el.clientHeight + 2 || isScrolledToEnd(el)) {
      reportedRef.current = true;
      onViewedToEnd();
    }
  }, [onViewedToEnd]);

  useEffect(() => {
    reportedRef.current = false;
    const el = ref.current;
    if (el) el.scrollTop = 0;
    // After layout, re-check (short pages auto-clear unseen).
    const id = window.requestAnimationFrame(() => check());
    return () => window.cancelAnimationFrame(id);
  }, [questionKey, check]);

  useEffect(() => {
    // Zoom changes layout height; re-evaluate.
    check();
  }, [zoomLevel, check]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    void e;
    check();
  };

  return (
    <div
      ref={ref}
      className="pearson-viewport"
      onScroll={onScroll}
      data-question-key={questionKey}
    >
      <div
        className="pearson-viewport-zoom"
        style={
          {
            // CSS zoom is non-standard but matches Pearson magnification UX.
            zoom: zoomLevel / 100,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
