/**
 * Compact paper type selection card component
 */

import { cn } from "@/lib/utils";
import type { PaperType } from "@/types/papers";

interface PaperTypeCardProps {
  paperName: PaperType;
  fullName: string;
  isSelected: boolean;
  onClick: () => void;
  attempted?: boolean;
  bestScore?: number;
}

export function PaperTypeCard({ 
  paperName, 
  fullName, 
  isSelected, 
  onClick, 
  attempted = false,
  bestScore 
}: PaperTypeCardProps) {
  const getCardStyles = (paper: PaperType) => {
    switch (paper) {
      case "ESAT":
        return {
          bg: "bg-primary/10",
          border: "border-primary/30",
          icon: "bg-primary/20",
          iconColor: "text-primary"
        };
      case "TMUA":
        return {
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          icon: "bg-purple-500/20",
          iconColor: "text-purple-400"
        };
      case "NSAA":
        return {
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/30",
          icon: "bg-cyan-500/20",
          iconColor: "text-cyan-400"
        };
      case "ENGAA":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          icon: "bg-amber-500/20",
          iconColor: "text-amber-400"
        };
      case "PAT":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          icon: "bg-rose-500/20",
          iconColor: "text-rose-400"
        };
      default:
        return {
          bg: "bg-neutral-500/10",
          border: "border-neutral-500/30",
          icon: "bg-neutral-500/20",
          iconColor: "text-neutral-400"
        };
    }
  };

  const styles = getCardStyles(paperName);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full p-4 rounded-organic-md transition-all duration-fast ease-signature text-center outline-none focus:outline-none",
        "hover:shadow-glow interaction-scale",
        isSelected
          ? `${styles.bg} shadow-glow`
          : "bg-white/5 hover:bg-white/10"
      )}
    >
      {/* Attempted Badge */}
      {attempted && (
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      )}

      <div className="space-y-2">
        {/* Icon and Title */}
        <div className="flex items-center justify-center">
          <div className={cn("w-8 h-8 rounded-organic-md flex items-center justify-center", styles.icon)}>
            <svg className={cn("w-4 h-4", styles.iconColor)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        
        <div className="text-lg font-bold text-neutral-100">{paperName}</div>
        
        {/* Best Score */}
        {bestScore && (
          <div className="text-xs text-neutral-400">Best: {bestScore}%</div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex items-center justify-center gap-1 text-xs text-neutral-300">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span>Selected</span>
          </div>
        )}
      </div>
    </button>
  );
}