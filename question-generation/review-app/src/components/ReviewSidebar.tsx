"use client";

import { useState } from "react";
import { CheckCircle2, BarChart3, Info, X, Trash2, SkipForward, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { BugReportModal } from "./BugReportModal";

interface ReviewSidebarProps {
  checklistItems: boolean[];
  optionalChecklistItem: boolean;
  onChecklistChange: (index: number, checked: boolean) => void;
  onOptionalChecklistChange: (checked: boolean) => void;
  onApprove: () => void;
  onDelete: () => void;
  onSkip: () => void;
  onFilters: () => void;
  onBugReport?: () => void;
  currentQuestionId?: string | null;
  canApprove: boolean;
  isApproving?: boolean;
  isDeleting?: boolean;
  isGoodQuestion: boolean;
  onGoodQuestionChange: (checked: boolean) => void;
}

const CHECKLIST_LABELS = [
  "No formatting issues and reads well",
  "The answer is correct, solution is OK",
  "The question is ESAT / TMUA level",
  "The tags (subject, difficulty) are reasonable",
];

const OPTIONAL_CHECKLIST_LABEL = "Added or changed options and explanations to make question more tricky (if there are more pitfalls)";

export function ReviewSidebar({
  checklistItems,
  optionalChecklistItem,
  onChecklistChange,
  onOptionalChecklistChange,
  onApprove,
  onDelete,
  onSkip,
  onFilters,
  onBugReport,
  currentQuestionId,
  canApprove,
  isApproving = false,
  isDeleting = false,
  isGoodQuestion,
  onGoodQuestionChange,
}: ReviewSidebarProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

  return (
    <>
      <div className="w-[280px] h-screen flex flex-col bg-white/[0.02] border-r border-white/10 flex-shrink-0 overflow-hidden">
        {/* Info and Bug Report Buttons */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setShowInfo(true)}
              className={cn(
                "flex-1 px-3 py-2.5 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-xs font-medium border border-white/10",
                "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer"
              )}
            >
              <Info className="w-4 h-4" strokeWidth={2.5} />
              <span>Info</span>
            </button>
            <button
              onClick={() => setShowBugReport(true)}
              className={cn(
                "flex-1 px-3 py-2.5 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-xs font-medium border border-white/10",
                "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer"
              )}
            >
              <Bug className="w-4 h-4" strokeWidth={2.5} />
              <span>Report Bug</span>
            </button>
          </div>
        </div>

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
                {index + 1}. {label}
              </span>
            </label>
          ))}
          
          {/* Optional Checklist Item */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={optionalChecklistItem}
              onChange={(e) => onOptionalChecklistChange(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-sm text-white/60 font-mono leading-relaxed group-hover:text-white/70 transition-colors italic">
                Optional: {OPTIONAL_CHECKLIST_LABEL}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Good Question Checkbox */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isGoodQuestion}
            onChange={(e) => onGoodQuestionChange(e.target.checked)}
            disabled={isApproving}
            className="mt-1 w-5 h-5 rounded border-2 border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/50 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              accentColor: '#FFD700',
            }}
          />
          <div className="flex-1">
            <span className="text-sm text-[#FFD700]/90 font-mono leading-relaxed group-hover:text-[#FFD700] transition-colors font-semibold">
              Mark as good question
            </span>
            <p className="text-sm text-[#FFD700]/60 font-mono mt-1 leading-relaxed">
              Rare qs you think are good: Challenging, interesting, almost got me there.
            </p>
          </div>
        </label>
      </div>

      {/* Action Buttons Row */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Approve Button */}
          <button
            onClick={onApprove}
            disabled={!canApprove || isApproving || isDeleting}
            className={cn(
              "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium whitespace-nowrap",
              canApprove && !isApproving && !isDeleting
                ? "bg-[#85BC82]/30 hover:bg-[#85BC82]/40 text-[#85BC82] cursor-pointer"
                : "bg-white/5 text-white/40 cursor-not-allowed"
            )}
            style={
              canApprove && !isApproving && !isDeleting
                ? {
                    boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                  }
                : undefined
            }
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
            <span>{isApproving ? 'Approving...' : 'Approve Question'}</span>
          </button>

          {/* Skip Button - Icon Only */}
          <button
            onClick={onSkip}
            disabled={isApproving || isDeleting}
            className={cn(
              "p-2 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center border border-white/10",
              isApproving || isDeleting
                ? "bg-white/5 text-white/40 cursor-not-allowed border-white/10"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 cursor-pointer"
            )}
            title="Skip question"
          >
            <SkipForward className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Delete Button - Icon Only */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isApproving || isDeleting}
            className={cn(
              "p-2 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center border border-red-500/30",
              isApproving || isDeleting
                ? "bg-white/5 text-white/40 cursor-not-allowed border-white/10"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 cursor-pointer"
            )}
            title="Delete question"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
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

    {/* Info Modal */}
    {showInfo && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowInfo(false)}
      >
        <div 
          className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-white/[0.02] border border-white/10 rounded-organic-lg shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-mono text-white/90 font-semibold">Question Review Information</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4 font-mono text-sm text-white/80 leading-relaxed">
              <div>
                <h3 className="text-white/90 font-semibold mb-2">1. Question Source</h3>
                <p className="text-white/70">Most questions are human written. Some are reworded, checked and solved by AI and may have formatting errors. Make sure the question makes sense and there are no formatting errors.</p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-2">2. Syllabus Compliance</h3>
                <p className="text-white/70">Sometimes the question is off syllabus. In this case, either edit it or discard it.</p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-2">3. Tags and Metadata</h3>
                <p className="text-white/70">There are tags telling you information about each question at the top: paper type, difficulty, and primary and secondary tags. The primary tag is a requirement, secondary tags are optional.</p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-2">4. Distractor Map</h3>
                <p className="text-white/70">Distractor map is added to explain to the user why each option could be incorrect.</p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-2">5. Hint</h3>
                <p className="text-white/70">Hint was originally commentary and has been repurposed. See if it reads right.</p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-2">6. Mark as Good Question</h3>
                <p className="text-white/70">Before approving, if you feel this is a great question, check "Mark as good question". This should be rare (maybe 1 in 10-20 questions). Use this for questions that are actually challenging, fitting and interesting with an elegant solution.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex-shrink-0">
            <button
              onClick={() => setShowInfo(false)}
              className="w-full px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowDeleteConfirm(false)}
      >
        <div 
          className="relative w-full max-w-md mx-4 bg-white/[0.02] border border-red-500/30 rounded-organic-lg shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-red-500/30 flex-shrink-0">
            <h2 className="text-lg font-mono text-red-400 font-semibold">Delete Question</h2>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4 font-mono text-sm text-white/80 leading-relaxed">
              <p className="text-white/90 font-semibold mb-2">
                Are you sure? This is irreversible.
              </p>
              <p className="text-white/70">
                Only delete when the question is not easily salvageable by editing it.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-red-500/30 flex-shrink-0 flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
              disabled={isDeleting}
              className={cn(
                "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
                isDeleting
                  ? "bg-red-500/20 text-red-400/50 cursor-not-allowed"
                  : "bg-red-500/30 hover:bg-red-500/40 text-red-400 hover:text-red-300 cursor-pointer"
              )}
            >
              <Trash2 className="w-4 h-4" strokeWidth={2.5} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Bug Report Modal */}
    <BugReportModal
      isOpen={showBugReport}
      onClose={() => setShowBugReport(false)}
      questionId={currentQuestionId}
    />
    </>
  );
}

