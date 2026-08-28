"use client";

import { useEffect, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  colourSchemeCssVars,
  usesFullPageTheme,
} from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId, ZoomLevel } from "@/lib/pearson/types";
import { cn } from "@/lib/utils";
import "./pearson.css";

const PEARSON_ACTIVE_CLASS = "pearson-exam-active";

function clearRadioFocusOutsideOption(e: PointerEvent<HTMLDivElement>) {
  const target = e.target as HTMLElement;
  if (!target.closest(".pearson-radio-row")) {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

interface PearsonExamShellProps {
  colourScheme: ColourSchemeId;
  zoomLevel: ZoomLevel;
  className?: string;
  children: ReactNode;
}

export function PearsonExamShell({
  colourScheme,
  zoomLevel,
  className,
  children,
}: PearsonExamShellProps) {
  const vars = colourSchemeCssVars(colourScheme) as CSSProperties;
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

