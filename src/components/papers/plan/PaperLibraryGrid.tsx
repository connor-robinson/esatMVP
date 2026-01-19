/**
 * PaperLibraryGrid - middle panel showing papers in a grid layout
 */

"use client";

import { Card } from "@/components/ui/Card";
import type { Paper } from "@/types/papers";
import { PaperLibraryCard } from "./PaperLibraryCard";

interface PaperLibraryGridProps {
  papers: Paper[];
  selectedPaperIds: Set<number>;
  onToggleSelect: (paper: Paper) => void;
}

export function PaperLibraryGrid({
  papers,
  selectedPaperIds,
  onToggleSelect,
}: PaperLibraryGridProps) {
  return (
    <Card variant="flat" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Paper Library
          </h2>
          <p className="text-xs text-white/45 mt-1">
            Browse past papers and add them to your practice session.
          </p>
        </div>
        <div className="text-xs text-white/50">
          {papers.length} result{papers.length === 1 ? "" : "s"}
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-white/40">
          No papers found with the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {papers.map((paper) => (
            <PaperLibraryCard
              key={paper.id}
              paper={paper}
              isSelected={selectedPaperIds.has(paper.id)}
              onToggleSelect={() => onToggleSelect(paper)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}


















