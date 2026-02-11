/**
 * Subject categories sidebar - Left column
 */

"use client";

import { Calculator, FunctionSquare, Triangle, BarChart3, Atom, Zap, Infinity } from "lucide-react";
import { TopicCategory } from "@/types/core";
import { cn } from "@/lib/utils";

type HighLevelCategory =
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "number_theory"
  | "shortcuts"
  | "trigonometry"
  | "physics"
  | "other";

interface SubjectCategoriesProps {
  selectedCategory: HighLevelCategory | null;
  onSelectCategory: (category: HighLevelCategory) => void;
}

// Helper to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const categoryConfig: Record<
  HighLevelCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; colorHex: string }
> = {
  arithmetic: { label: "Arithmetic", icon: Calculator, colorHex: "#3d6064" }, // maths
  algebra: { label: "Algebra", icon: FunctionSquare, colorHex: "#5a8a8c" }, // accent
  geometry: { label: "Geometry", icon: Triangle, colorHex: "#4e6b8a" }, // biology
  number_theory: { label: "Number Theory", icon: Infinity, colorHex: "#9e5974" }, // advanced
  shortcuts: { label: "Shortcuts", icon: Zap, colorHex: "#7b6fa6" }, // secondary
  trigonometry: { label: "Trigonometry", icon: Triangle, colorHex: "#8c525a" }, // chemistry
  physics: { label: "Physics", icon: Atom, colorHex: "#6b5e94" }, // physics
  other: { label: "Other", icon: BarChart3, colorHex: "#85BC82" }, // primary (success)
};

export function SubjectCategories({
  selectedCategory,
  onSelectCategory,
}: SubjectCategoriesProps) {
  return (
    <aside className="hidden lg:flex w-24 xl:w-28 flex-col items-center py-6 bg-surface-mid">
      <div className="space-y-8">
        {(Object.keys(categoryConfig) as HighLevelCategory[]).map((category) => {
          const config = categoryConfig[category];
          const Icon = config.icon;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={cn(
                "flex flex-col items-center gap-2 w-full px-2 transition-all",
                !isSelected && "opacity-60 hover:opacity-100"
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  isSelected ? "text-background" : "bg-surface-elevated text-white hover:bg-surface-neutral"
                )}
                style={
                  isSelected
                    ? { 
                        backgroundColor: hexToRgba(config.colorHex, 0.75) // Lighter for black icons
                      }
                    : undefined
                }
              >
                <Icon className="w-7 h-7" />
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isSelected ? "text-text" : "text-white/70"
                )}
              >
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
