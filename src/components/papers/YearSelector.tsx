/**
 * YearSelector component for the papers wizard
 */

import { cn } from "@/lib/utils";

interface YearSelectorProps {
  years: string[];
  selectedYear: string | null;
  onYearSelect: (year: string) => void;
  completedYears?: string[];
}

export function YearSelector({ years, selectedYear, onYearSelect, completedYears = [] }: YearSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {years.map((year) => {
        const isSelected = selectedYear === year;
        const isCompleted = completedYears.includes(year);
        
        return (
          <button
            key={year}
            onClick={() => onYearSelect(year)}
            className={cn(
              "px-5 py-2.5 rounded-organic-md transition-all duration-fast ease-signature outline-none focus:outline-none",
              "interaction-scale",
              !isSelected && !isCompleted ? "bg-white/5 hover:bg-white/10" : ""
            )}
            style={isSelected || isCompleted ? { backgroundColor: "#506141" } : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-100">{year}</span>
              {isCompleted && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#506141", color: "#ffffff" }}>
                  {/* Thick rounded check */}
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
