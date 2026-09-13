"use client";

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MarkSection =
  | "overview"
  | "stats"
  | "review"
  | "mistakes"
  | "notes";

const SECTIONS: {
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

interface MarkSectionNavProps {
  active: MarkSection;
  onSelect: (section: MarkSection) => void;
  /** Hub teaser mark page: light surfaces, tighter radius. */
  light?: boolean;
}

export function MarkSectionNav({ active, onSelect, light }: MarkSectionNavProps) {
  return (
    <>
      <nav
        className={cn(
          "scrollbar-hide flex shrink-0 gap-1 overflow-x-auto p-1.5 lg:hidden",
          light
            ? "rounded-md bg-[#ebebef]"
            : "rounded-organic-lg bg-surface",
        )}
        aria-label="Mark session sections"
      >
        {SECTIONS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "shrink-0 px-3 py-2 text-xs font-medium transition-colors",
                light ? "rounded-md" : "rounded-organic-md",
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
          "scrollbar-hide hidden h-full min-h-0 w-[4.75rem] shrink-0 flex-col overflow-hidden lg:flex xl:w-24",
          light
            ? "rounded-md bg-[#ebebef]"
            : "rounded-organic-xl bg-surface",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-2 py-4">
          <nav
            className="flex w-full flex-col items-center gap-1.5"
            aria-label="Mark session sections"
          >
            {SECTIONS.map(({ id, label, shortLabel, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  title={label}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-colors duration-fast ease-signature",
                    light ? "rounded-md bg-white" : "rounded-organic-lg",
                    isActive
                      ? light
                        ? "text-black"
                        : "bg-surface-mid text-text"
                      : light
                        ? "text-black/55 hover:text-black"
                        : "text-text-muted hover:bg-surface-elevated hover:text-text",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center",
                      light ? "rounded-md" : "rounded-organic-lg",
                      isActive
                        ? light
                          ? "bg-[#E8F1FF] text-black"
                          : "bg-maths/20 text-maths"
                        : light
                          ? "bg-transparent text-black/70"
                          : "bg-surface-elevated",
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
