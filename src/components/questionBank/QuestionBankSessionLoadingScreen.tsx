"use client";

import { useEffect, useMemo, useState } from "react";
import { pickRandomSessionLoadingHint } from "@/lib/questionBank/sessionLoadingHints";
import "@/components/questionBank/esatUiPreview/esatUiPreview.css";

const SEGMENTS = 15;

interface QuestionBankSessionLoadingScreenProps {
  label?: string;
  hint?: string;
}

/**
 * ESAT / UAT-UK style session loader: plain label, segmented bar, small hint.
 * No icons or brand chrome.
 */
export function QuestionBankSessionLoadingScreen({
  label = "Loading, please wait...",
  hint: hintProp,
}: QuestionBankSessionLoadingScreenProps) {
  const [filled, setFilled] = useState(0);
  const hint = useMemo(
    () => hintProp ?? pickRandomSessionLoadingHint(),
    [hintProp],
  );

  useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      setFilled(count % (SEGMENTS + 1));
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="eup-session-loading"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <p className="eup-session-loading-text">{label}</p>
      <div className="eup-session-loading-bar" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={
              i < filled
                ? "eup-session-loading-seg eup-session-loading-seg--on"
                : "eup-session-loading-seg"
            }
          />
        ))}
      </div>
      <p className="eup-session-loading-hint">{hint}</p>
    </div>
  );
}
