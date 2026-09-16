"use client";

import { useEffect, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  colourSchemeCssVars,
  usesFullPageTheme,
  type PearsonChromeVariant,
} from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId, ZoomLevel } from "@/lib/pearson/types";
import { cn } from "@/lib/utils";
import "./pearson.css";

const PEARSON_ACTIVE_CLASS = "pearson-exam-active";

function clearRadioFocusOutsideOption(e: PointerEvent<HTMLDivElement>) {
  const target = e.target as HTMLElement;
  if (!target.closest(".pearson-radio-row, .pearson-option-table-row")) {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

interface PearsonExamShellProps {
  colourScheme: ColourSchemeId;
  zoomLevel: ZoomLevel;
  /** Blue = specimen default. Purple = question-bank exam branding. */
  chromeVariant?: PearsonChromeVariant;
  className?: string;
  children: ReactNode;
}

export function PearsonExamShell({
  colourScheme,
  zoomLevel,
  chromeVariant = "blue",
  className,
  children,
}: PearsonExamShellProps) {
  const vars = colourSchemeCssVars(colourScheme, chromeVariant) as CSSProperties;
  // Keep "blue" chrome-mode selectors (hover yellow, borders) even for purple
  // branding. Colour comes from CSS variables, not data-chrome-mode.
  const chromeMode = usesFullPageTheme(colourScheme) ? "themed" : "blue";

  // Lock document scroll and detach site typography while the player is open.
  useEffect(() => {
    document.documentElement.classList.add(PEARSON_ACTIVE_CLASS);
    return () => {
      document.documentElement.classList.remove(PEARSON_ACTIVE_CLASS);
    };
  }, []);

  return (
    <div
      className={cn("pearson-exam-root", className)}
      style={{
        ...vars,
        ["--pearson-zoom" as string]: String(zoomLevel / 100),
      }}
      data-colour-scheme={colourScheme}
      data-chrome-mode={chromeMode}
      data-zoom={zoomLevel}
      role="application"
      aria-label="Exam player"
      onPointerDownCapture={clearRadioFocusOutsideOption}
    >
      {children}
    </div>
  );
}

