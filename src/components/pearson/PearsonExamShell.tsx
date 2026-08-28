"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  colourSchemeCssVars,
  usesFullPageTheme,
} from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId, ZoomLevel } from "@/lib/pearson/types";
import { cn } from "@/lib/utils";
import "./pearson.css";

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
    >
      {children}
    </div>
  );
}

