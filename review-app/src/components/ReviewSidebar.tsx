"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewSidebarProps {
  checklistItems: boolean[];
  onChecklistChange: (index: number, checked: boolean) => void;
  onApprove: () => void;
  onFilters: () => void;
  canApprove: boolean;
  isApproving?: boolean;
}

const CHECKLIST_LABELS = [
  "The question is readable",
  "There are no formatting errors",
  "All options are clear and correct",
  "The solution is accurate and complete",
  "Tags and metadata are correct",
];

export function ReviewSidebar({
  checklistItems,
  onChecklistChange,
  onApprove,
  onFilters,
  canApprove,
  isApproving = false,
}: ReviewSidebarProps) {
  return (
    <div className="w-[280px] h-screen flex flex-col bg-white/[0.02] border-r border-white/10 flex-shrink-0 overflow-hidden">
      {/* Checklist Section */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        <h3 className="text-sm font-mono text-white/60 uppercase tracking-wide mb-4">
          Review Checklist
        </h3>
        <div className="space-y-3">
          {CHECKLIST_LABELS.map((label, index) => (
            <label
              key={index}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={checklistItems[index] || false}
                onChange={(e) => onChecklistChange(index, e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-white/80 font-mono leading-relaxed group-hover:text-white/90 transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Approve Button */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={onApprove}
          disabled={!canApprove || isApproving}
          className={cn(
            "w-full px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
            canApprove && !isApproving
              ? "bg-[#85BC82]/30 hover:bg-[#85BC82]/40 text-[#85BC82] cursor-pointer"
              : "bg-white/5 text-white/40 cursor-not-allowed"
          )}
          style={
            canApprove && !isApproving
              ? {
                  boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                }
              : undefined
          }
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
          <span>{isApproving ? 'Approving...' : 'Approve Question'}</span>
        </button>
      </div>

      {/* Filters Button */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={onFilters}
          disabled={isApproving}
          className={cn(
            "w-full px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium border border-white/10",
            isApproving
              ? "bg-white/5 text-white/40 cursor-not-allowed"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer"
          )}
        >
          <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
          <span>Filters</span>
        </button>
      </div>
    </div>
  );
}

