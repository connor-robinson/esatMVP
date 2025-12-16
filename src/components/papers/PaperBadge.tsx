/**
 * Paper badge component with color-coded styling
 */

import { cn } from "@/lib/utils";
import type { PaperType } from "@/types/papers";

interface PaperBadgeProps {
  paperName: PaperType;
  className?: string;
}

export function PaperBadge({ paperName, className }: PaperBadgeProps) {
  const getBadgeStyles = (paper: PaperType) => {
    switch (paper) {
      case "ESAT":
        return "bg-primary/20 text-primary ring-primary/40";
      case "TMUA":
        return "bg-purple-500/20 text-purple-300 ring-purple-500/40";
      case "NSAA":
        return "bg-cyan-500/20 text-cyan-300 ring-cyan-500/40";
      case "ENGAA":
        return "bg-amber-500/20 text-amber-300 ring-amber-500/40";
      case "PAT":
        return "bg-rose-500/20 text-rose-300 ring-rose-500/40";
      case "OTHER":
        return "bg-neutral-500/20 text-neutral-300 ring-neutral-500/40";
      default:
        return "bg-neutral-500/20 text-neutral-300 ring-neutral-500/40";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-organic-sm px-2 py-1 text-xs font-medium ring-1",
        getBadgeStyles(paperName),
        className
      )}
    >
      {paperName}
    </span>
  );
}


