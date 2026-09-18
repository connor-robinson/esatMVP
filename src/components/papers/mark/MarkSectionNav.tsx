"use client";

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type MarkSection =
  | "overview"
  | "compare"
  | "stats"
  | "review"
  | "mistakes"
  | "notes";

const BASE_SECTIONS: {
  id: MarkSection;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { id: "stats", label: "Detailed Stats", shortLabel: "Stats", icon: BarChart3 },
  { id: "review", label: "Question Review", shortLabel: "Review", icon: ListChecks },
  { id: "mistakes", label: "Mistakes", shortLabel: "Mistakes", icon: ClipboardList },
  { id: "notes", label: "Session Notes", shortLabel: "Notes", icon: StickyNote },
];

const COMPARE_SECTION = {
  id: "compare" as const,
  label: "vs friend",
  shortLabel: "Friend",
  icon: Users,
};

const DEFAULT_LIGHT_RAIL = "#f0f0f2";

interface MarkSectionNavProps {
  active: MarkSection;
  onSelect: (section: MarkSection) => void;
  /** Light surfaces + white nav tiles (hub / user light theme). */
  light?: boolean;
  /** Override rail/aside surface class (should match the main mark panel). */
  railClassName?: string;
  /** Inline surface color so it cannot lose to transparent utilities. */
  railStyle?: CSSProperties;
  /**
   * Friend-compare sitting: replace Overview with Compare as the lead tab.
   */
  compareMode?: boolean;
}

export function MarkSectionNav({
  active,
  onSelect,
  light,
  railClassName,
  railStyle,
  compareMode,
}: MarkSectionNavProps) {
  const lightRailStyle =
    light && !railStyle
      ? ({ backgroundColor: DEFAULT_LIGHT_RAIL } as const)
      : railStyle;

  const sections = compareMode
    ? [
        COMPARE_SECTION,
        ...BASE_SECTIONS.filter((s) => s.id !== "overview"),
      ]
    : BASE_SECTIONS;

  return (
    <>
      <nav
        className={cn(
          "scrollbar-hide flex shrink-0 gap-1 overflow-x-auto rounded-md p-1.5 lg:hidden",
          railClassName ?? (!light ? "bg-surface" : undefined),
        )}
        style={light ? lightRailStyle : railStyle}
        aria-label="Mark session sections"
      >
        {sections.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? light
                    ? "bg-white text-black"
                    : "bg-surface-mid text-text"
                  : light
                    ? "bg-white/80 text-black/60 hover:bg-white hover:text-black"
                    : "text-text-muted hover:bg-surface-elevated hover:text-text",
              )}
            >
              {label}
            </button>
          );
        })}
      </nav>
      <aside
        className={cn(
          "scrollbar-hide hidden h-full min-h-0 w-[4.75rem] shrink-0 flex-col overflow-hidden rounded-md lg:flex xl:w-24",
          railClassName ?? (!light ? "bg-surface" : undefined),
        )}
        style={light ? lightRailStyle : railStyle}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-2 py-4">
          <nav
            className="flex w-full flex-col items-center gap-1.5"
            aria-label="Mark session sections"
          >
            {sections.map(({ id, label, shortLabel, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  title={label}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-2 transition-colors duration-fast ease-signature",
                    light
                      ? "bg-white"
                      : isActive
                        ? "bg-surface-mid"
                        : "bg-surface-elevated",
                    isActive
                      ? light
                        ? "text-black"
                        : "text-text"
                      : light
                        ? "text-black/55 hover:text-black"
                        : "text-text-muted hover:text-text",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-md",
                      isActive
                        ? light
                          ? "bg-[#E8F1FF] text-black"
                          : "bg-maths/20 text-maths"
                        : light
                          ? "bg-transparent text-black/70"
                          : "bg-transparent",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="max-w-full text-center text-[10px] font-medium leading-tight tracking-[0.04em]">
                    {shortLabel}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
