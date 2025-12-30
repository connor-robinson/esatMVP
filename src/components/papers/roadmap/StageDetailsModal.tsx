/**
 * StageDetailsModal - Modal for viewing and managing a roadmap stage
 * Allows section selection, manual marking, and starting sessions
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Check, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import { getSectionForRoadmapPart } from "@/lib/papers/roadmapConfig";
import { markPartAsCompleted } from "@/lib/papers/roadmapCompletion";
import { supabase } from "@/lib/supabase/client";
import type { PaperSection } from "@/types/papers";

interface StageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: RoadmapStage | null;
  userId: string | null;
  completionData: Map<string, boolean>; // partKey -> isCompleted
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  onCompletionUpdate: () => void; // Callback to refresh completion data
}

export function StageDetailsModal({
  isOpen,
  onClose,
  stage,
  userId,
  completionData,
  onStartSession,
  onCompletionUpdate,
}: StageDetailsModalProps) {
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    timeSpent: number | null;
    averageScore: number | null;
  }>({ timeSpent: null, averageScore: null });

  // Initialize selected parts to all parts when stage changes
  useEffect(() => {
    if (stage) {
      const allPartKeys = new Set(
        stage.parts.map(
          (part) => `${part.paperName}-${part.partLetter}-${part.examType}`
        )
      );
      setSelectedParts(allPartKeys);
    }
  }, [stage]);

  // Load stats for this stage
  useEffect(() => {
    if (!isOpen || !stage || !userId) {
      setStats({ timeSpent: null, averageScore: null });
      return;
    }

    async function loadStats() {
      try {
        // Query sessions for this stage
        const paperVariants = new Set(
          stage.parts.map(
            (part) => `${stage.year}-${part.paperName}-${part.examType}`
          )
        );

        // Query sessions for each variant separately (Supabase .in() may have issues with arrays)
        const allSessions: any[] = [];
        for (const variant of paperVariants) {
          const { data: variantData, error: variantError } = await supabase
            .from("paper_sessions")
            .select("time_limit_minutes, score, ended_at")
            .eq("user_id", userId)
            .eq("paper_name", stage.examName)
            .eq("paper_variant", variant)
            .not("ended_at", "is", null);
          
          if (variantError) {
            console.error("[StageDetailsModal] Error loading stats for variant:", variant, variantError);
            continue;
          }
          
          if (variantData) {
            allSessions.push(...variantData);
          }
        }

        const data = allSessions;

        if (!data || data.length === 0) {
          setStats({ timeSpent: null, averageScore: null });
          return;
        }

        // Calculate total time spent
        const totalTime = data.reduce(
          (sum, session) => sum + (session.time_limit_minutes || 0),
          0
        );

        // Calculate average score
        const scoredSessions = data.filter(
          (session) => session.score && typeof session.score === "object"
        );
        let avgScore: number | null = null;
        if (scoredSessions.length > 0) {
          const scores = scoredSessions.map((session) => {
            const score = session.score as { correct: number; total: number };
            return (score.correct / score.total) * 100;
          });
          avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        setStats({
          timeSpent: totalTime > 0 ? totalTime : null,
          averageScore: avgScore,
        });
      } catch (error) {
        console.error("[StageDetailsModal] Error in loadStats:", error);
      }
    }

    loadStats();
  }, [isOpen, stage, userId]);

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !stage) return null;

  const examColor = getPaperTypeColor(stage.examName);
  const completedCount = Array.from(completionData.values()).filter(
    (v) => v
  ).length;
  const totalCount = stage.parts.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPartKeys = new Set(
        stage.parts.map(
          (part) => `${part.paperName}-${part.partLetter}-${part.examType}`
        )
      );
      setSelectedParts(allPartKeys);
    } else {
      setSelectedParts(new Set());
    }
  };

  const handlePartToggle = (partKey: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partKey)) {
      newSelected.delete(partKey);
    } else {
      newSelected.add(partKey);
    }
    setSelectedParts(newSelected);
  };

  const handleMarkAsDone = async (part: RoadmapPart) => {
    if (!userId) return;

    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
    setIsMarking(partKey);

    try {
      const success = await markPartAsCompleted(
        userId,
        stage.examName,
        stage.year,
        part
      );

      if (success) {
        // Refresh completion data
        onCompletionUpdate();
      }
    } catch (error) {
      console.error("[StageDetailsModal] Error marking part:", error);
    } finally {
      setIsMarking(null);
    }
  };

  const handleStartSession = () => {
    const selectedPartsList = stage.parts.filter((part) => {
      const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
      return selectedParts.has(partKey);
    });

    if (selectedPartsList.length > 0) {
      onStartSession(stage, selectedPartsList);
      onClose();
    }
  };

  const allSelected = useMemo(() => {
    return (
      selectedParts.size === stage.parts.length &&
      stage.parts.every((part) => {
        const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
        return selectedParts.has(partKey);
      })
    );
  }, [selectedParts, stage.parts]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-neutral-900 rounded-organic-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: `${examColor}20`, color: examColor }}
            >
              {stage.year}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white/90">
                  {stage.examName} {stage.year}
                </h2>
                {/* Progress at top */}
                <div className="text-sm text-white/60">
                  {completedCount}/{totalCount} completed
                </div>
                {stats.timeSpent !== null && (
                  <div className="text-sm text-white/50">
                    {stats.timeSpent}m
                  </div>
                )}
                {stats.averageScore !== null && (
                  <div className="text-sm text-white/50">
                    {stats.averageScore.toFixed(1)}% avg
                  </div>
                )}
              </div>
              <p className="text-xs text-white/50 mt-1">{stage.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Explanation */}
          <div className="text-sm text-white/60 leading-relaxed">
            Select the sections you want to practice, or mark sections as done if you've completed them elsewhere. Then click "Start Session" to begin.
          </div>

          {/* Section Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/90">
                Select Sections to Practice
              </h3>
              <button
                onClick={() => handleSelectAll(!allSelected)}
                className="text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {stage.parts.map((part) => {
                const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                const isCompleted = completionData.get(partKey) || false;
                const isSelected = selectedParts.has(partKey);

                return (
                  <div
                    key={partKey}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isCompleted
                        ? "bg-primary/10"
                        : "bg-white/5"
                    )}
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePartToggle(partKey)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition",
                        isSelected 
                          ? 'bg-[rgba(80,97,65,0.25)] text-neutral-100' 
                          : 'bg-[#141820] text-neutral-300 hover:bg-[#161a21]'
                      )}>
                        <span 
                          className="inline-block w-3 h-3 rounded-[4px] transition-colors" 
                          style={{ 
                            backgroundColor: isSelected ? '#85BC82' : 'rgba(255,255,255,0.08)' 
                          }} 
                        />
                        {isSelected ? 'Selected' : 'Select'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/90">
                          {part.partLetter}: {part.partName}
                        </div>
                        <div className="text-xs text-white/50">
                          {part.paperName} • {part.examType}
                        </div>
                      </div>
                    </label>
                    {isCompleted ? (
                      <CheckCircle2
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: examColor }}
                      />
                    ) : (
                      userId && (
                        <button
                          onClick={() => handleMarkAsDone(part)}
                          disabled={isMarking === partKey}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0",
                            isMarking === partKey
                              ? "bg-white/5 text-white/30 cursor-not-allowed"
                              : "bg-[#0f1114] text-neutral-300 hover:bg-[#121418] ring-1 ring-white/10"
                          )}
                        >
                          {isMarking === partKey ? "Marking..." : "Mark Done"}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mark Sections as Done Section */}
          {userId && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white/90">
                Mark Sections as Done
              </h3>
              <p className="text-xs text-white/50">
                If you've completed any sections outside this app, mark them as done to track your progress.
              </p>
              <div className="space-y-2">
                {stage.parts
                  .filter(part => {
                    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                    return !completionData.get(partKey);
                  })
                  .map((part) => {
                    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                    return (
                      <div
                        key={partKey}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                      >
                        <div>
                          <div className="text-sm font-medium text-white/90">
                            {part.partLetter}: {part.partName}
                          </div>
                          <div className="text-xs text-white/50">
                            {part.paperName} • {part.examType}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMarkAsDone(part)}
                          disabled={isMarking === partKey}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            isMarking === partKey
                              ? "bg-white/5 text-white/30 cursor-not-allowed"
                              : "bg-[#0f1114] text-neutral-300 hover:bg-[#121418] ring-1 ring-white/10"
                          )}
                        >
                          {isMarking === partKey ? "Marking..." : "Mark Done"}
                        </button>
                      </div>
                    );
                  })}
                {stage.parts.every(part => {
                  const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                  return completionData.get(partKey);
                }) && (
                  <div className="text-xs text-white/40 text-center py-2">
                    All sections are already marked as done
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6">
          <button
            onClick={handleStartSession}
            disabled={selectedParts.size === 0}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-base transition-all duration-fast ease-signature",
              selectedParts.size === 0
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary-light interaction-scale"
            )}
          >
            <Play className="h-5 w-5" strokeWidth={2} />
            <span>Start Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}

