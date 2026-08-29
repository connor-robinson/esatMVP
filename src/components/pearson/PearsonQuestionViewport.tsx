"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  isSentinelVisibleInRoot,
  isViewportContentFullyViewed,
  viewportRequiresScrolling,
} from "@/lib/pearson/viewportSeen";
import type { ZoomLevel } from "@/lib/pearson/types";

interface PearsonQuestionViewportProps {
  questionKey: string | number;
  zoomLevel: ZoomLevel;
  onViewedChange: (viewed: boolean) => void;
  children: ReactNode;
}

/**
 * Scrollable question content. Tracks scroll-to-bottom for Unseen Content gate.
 * Uses a bottom sentinel + resize/image hooks so async diagrams do not false-mark.
 */
export function PearsonQuestionViewport({
  questionKey,
  zoomLevel,
  onViewedChange,
  children,
}: PearsonQuestionViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  const evaluate = useCallback(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const { scrollTop, scrollHeight, clientHeight } = root;
    const requiresScroll = viewportRequiresScrolling(scrollHeight, clientHeight);
    const viewed =
      isViewportContentFullyViewed(scrollTop, scrollHeight, clientHeight) ||
      isSentinelVisibleInRoot(sentinel, root);

    if (viewed) {
      if (!viewedRef.current) {
        viewedRef.current = true;
        onViewedChange(true);
      }
      return;
    }

    if (viewedRef.current && requiresScroll) {
      viewedRef.current = false;
      onViewedChange(false);
    }
  }, [onViewedChange]);

  useEffect(() => {
    viewedRef.current = false;

    const root = scrollRef.current;
    if (root) {
      root.scrollTop = 0;
    }

    const raf = window.requestAnimationFrame(() => {
      evaluate();
      window.requestAnimationFrame(evaluate);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [questionKey, evaluate]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      () => evaluate(),
      { root, threshold: [0, 0.01, 0.25, 1] },
    );
    observer.observe(sentinel);

    const resizeTarget = root.querySelector(".pearson-viewport-zoom") ?? root;
    const resizeObserver = new ResizeObserver(() => evaluate());
    resizeObserver.observe(resizeTarget);

    const onImageLoad = () => evaluate();
    const attachImageListeners = () => {
      root.querySelectorAll("img").forEach((img) => {
        if (img.complete) return;
        img.addEventListener("load", onImageLoad);
        img.addEventListener("error", onImageLoad);
      });
    };

    attachImageListeners();
    const mutationObserver = new MutationObserver(() => {
      attachImageListeners();
      evaluate();
    });
    mutationObserver.observe(resizeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class"],
    });

    evaluate();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      root.querySelectorAll("img").forEach((img) => {
        img.removeEventListener("load", onImageLoad);
        img.removeEventListener("error", onImageLoad);
      });
    };
  }, [questionKey, zoomLevel, evaluate]);

  return (
    <div
      ref={scrollRef}
      className="pearson-viewport"
      onScroll={evaluate}
      data-question-key={questionKey}
      data-zoom-level={zoomLevel}
    >
      <div
        className="pearson-viewport-zoom"
        style={
          {
            zoom: zoomLevel / 100,
          } as CSSProperties
        }
      >
        {children}
        <div
          ref={sentinelRef}
          className="pearson-viewport-sentinel"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
