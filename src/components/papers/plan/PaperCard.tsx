/**
 * PaperCard - Individual paper card for selector
 */

"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { Paper } from "@/types/papers";

interface PaperCardProps {
  paper: Paper;
  isSelected: boolean;
  onAdd: () => void;
}

export function PaperCard({ paper, isSelected, onAdd }: PaperCardProps) {
  const examColor = getPaperTypeColor(paper.examName);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "bg-white/5 hover:bg-white/[0.07] border border-white/10"
      )}
      onClick={onAdd}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white/90 text-sm">
          {paper.examName} {paper.examYear}
        </div>
        <div className="text-xs text-white/50">
          {paper.paperName} • {paper.examType}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary/20 text-primary"
            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}






