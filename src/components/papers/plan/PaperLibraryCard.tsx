/**
 * PaperLibraryCard - enhanced paper card for library grid
 */

"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { Paper } from "@/types/papers";

interface PaperLibraryCardProps {
  paper: Paper;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function PaperLibraryCard({
  paper,
  isSelected,
  onToggleSelect,
}: PaperLibraryCardProps) {
  const accent = getPaperTypeColor(paper.examName);

  return (
    <button
      type="button"
      onClick={onToggleSelect}
      className={cn(
        "relative flex flex-col items-stretch rounded-2xl p-4 text-left transition-all",
        "bg-[#101216] hover:bg-[#141820] border border-white/8 shadow-sm",
        isSelected && "ring-2 ring-offset-0 ring-[rgba(133,188,130,0.7)]"
      )}
    >
      {/* Exam + year pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-neutral-100"
          style={{ backgroundColor: accent + "33" }}>
          {paper.examName} • {paper.examYear}
        </div>
        <div className="text-[11px] text-white/50">
          {paper.examType}
        </div>
      </div>

      {/* Title */}
      <div className="mb-2">
        <div className="text-sm font-semibold text-white/90 line-clamp-2">
          {paper.paperName}
        </div>
      </div>

      {/* Meta row (placeholder for richer stats later) */}
      <div className="mt-auto flex items-center justify-between text-[11px] text-white/45">
        <span>Past paper</span>
        {/* Could show question count / last practiced when available */}
      </div>

      {/* Select / selected badge */}
      <div className="absolute bottom-3 right-3">
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
            isSelected
              ? "bg-[rgba(133,188,130,0.18)] text-[#E0F4DF]"
              : "bg-white/5 text-white/70"
          )}
        >
          {isSelected ? (
            <>
              <Check className="w-3 h-3" />
              <span>In session</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}








