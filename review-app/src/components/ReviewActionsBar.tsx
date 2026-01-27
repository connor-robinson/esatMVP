"use client";

import { CheckCircle2, Pencil, BarChart3, Save, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewActionsBarProps {
  isEditMode: boolean;
  isSaving: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onSave: () => void;
  onAnalytics: () => void;
  onSkip: () => void;
}

export function ReviewActionsBar({
  isEditMode,
  isSaving,
  onApprove,
  onEdit,
  onSave,
  onAnalytics,
  onSkip,
}: ReviewActionsBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-white/10">
      <div className="flex items-center justify-between px-6 py-4 max-w-[1920px] mx-auto w-full">
        {/* Approve Button - Left */}
        <button
          onClick={onApprove}
          disabled={isEditMode || isSaving}
          className={cn(
            "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm font-medium",
            isEditMode || isSaving
              ? "bg-white/5 text-white/40 cursor-not-allowed"
              : "bg-[#85BC82]/30 hover:bg-[#85BC82]/40 text-[#85BC82] cursor-pointer"
          )}
          style={
            !isEditMode && !isSaving
              ? {
                  boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                }
              : undefined
          }
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
          <span>Approve Question</span>
        </button>

        {/* Edit/Save Button - Center */}
        {isEditMode ? (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm font-medium",
              isSaving
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-primary/40 hover:bg-primary/50 text-primary cursor-pointer animate-pulse-soft"
            )}
            style={
              !isSaving
                ? {
                    boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                  }
                : undefined
            }
          >
            <Save className="w-4 h-4" strokeWidth={2.5} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        ) : (
          <button
            onClick={onEdit}
            disabled={isSaving}
            className={cn(
              "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm font-medium",
              isSaving
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-interview/30 hover:bg-interview/40 text-interview cursor-pointer"
            )}
            style={
              !isSaving
                ? {
                    boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                  }
                : undefined
            }
          >
            <Pencil className="w-4 h-4" strokeWidth={2.5} />
            <span>Edit</span>
          </button>
        )}

        {/* Skip and Analytics Buttons - Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            disabled={isEditMode || isSaving}
            className={cn(
              "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm font-medium",
              isEditMode || isSaving
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer border border-white/10"
            )}
          >
            <SkipForward className="w-4 h-4" strokeWidth={2.5} />
            <span>Skip</span>
          </button>
          <button
            onClick={onAnalytics}
            disabled={isEditMode || isSaving}
            className={cn(
              "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm font-medium",
              isEditMode || isSaving
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer border border-white/10"
            )}
          >
            <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
            <span>Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
}

