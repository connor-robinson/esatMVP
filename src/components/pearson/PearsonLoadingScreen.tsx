"use client";

import { useEffect, useState } from "react";

const SEGMENTS = 15;

interface PearsonLoadingScreenProps {
  onComplete: () => void;
  /** Duration ms before auto-advancing (matches segmented bar fill). */
  durationMs?: number;
}

/**
 * Screen 1: "Loading, please wait..." with segmented progress bar.
 * VERIFIED_ESAT specimen player (user screenshots Aug 2026).
 */
export function PearsonLoadingScreen({
  onComplete,
  durationMs = 2200,
}: PearsonLoadingScreenProps) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const stepMs = durationMs / SEGMENTS;
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      setFilled(count);
      if (count >= SEGMENTS) {
        window.clearInterval(id);
        window.setTimeout(onComplete, 120);
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [durationMs, onComplete]);

  return (
    <div className="pearson-loading-screen">
      <p className="pearson-loading-text">Loading, please wait...</p>
      <div className="pearson-loading-bar" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={
              i < filled ? "pearson-loading-seg pearson-loading-seg--on" : "pearson-loading-seg"
            }
          />
        ))}
      </div>
    </div>
  );
}
