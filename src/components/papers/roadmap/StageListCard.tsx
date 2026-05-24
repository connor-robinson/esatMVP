/**
 * StageListCard — roadmap row + expansion (DESIGN.md tokens)
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getExamAccentTextClass,
  getExamAccentFillClass,
  getExamAccentSurfaceClass,
  getExamProgressFillClass,
} from "@/config/colors";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";

interface StageListCardProps {
  stage: RoadmapStage;
  index: number;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  isCurrent?: boolean;
  isCompleted?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  completionData: Map<string, boolean>;
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  timelineNodeY?: number;
}

export function StageListCard({
  stage,
  index,
  completedCount,
  totalCount,
  isUnlocked,
  isCurrent = false,
  isCompleted = false,
  isExpanded,
  onToggleExpand,
  completionData,
  onStartSession,
  timelineNodeY,
}: StageListCardProps) {
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());

  const getPartKey = (part: RoadmapPart): string => {
    const baseKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
    if (part.questionRange) {
      return `${baseKey}-${part.questionRange.start}-${part.questionRange.end}`;
    }
    return baseKey;
  };

  useEffect(() => {
    const incompletePartKeys = new Set(
      stage.parts
        .filter((part) => !completionData.get(getPartKey(part)))
        .map((part) => getPartKey(part)),
    );
    setSelectedParts(incompletePartKeys);
  }, [stage, completionData]);

  const handleCardClick = () => {
    if (!isUnlocked) return;
    onToggleExpand();
  };

  const handlePartToggle = (partKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedParts);
    if (next.has(partKey)) next.delete(partKey);
    else next.add(partKey);
    setSelectedParts(next);
  };

  const handleStartSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked && selectedParts.size > 0) {
      const selectedPartsList = stage.parts.filter((part) =>
        selectedParts.has(getPartKey(part)),
      );
      onStartSession(stage, selectedPartsList);
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const incompleteParts = stage.parts.filter(
      (part) => !completionData.get(getPartKey(part)),
    );

    if (
      selectedParts.size === incompleteParts.length &&
      incompleteParts.length > 0
    ) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(
        new Set(incompleteParts.map((part) => getPartKey(part))),
      );
    }
  };

  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="relative overflow-visible font-sans">
      {timelineNodeY !== undefined && (
        <div
          className="pointer-events-none absolute left-0 top-1/2 z-0 hidden -translate-x-full -translate-y-1/2 lg:block"
          style={{
            width: "calc(18% + 2rem)",
            height: "1px",
            background:
              "linear-gradient(to left, var(--color-border-subtle), transparent)",
          }}
        />
      )}

      <motion.div
        layout
        className={cn(
          "relative flex flex-col overflow-hidden rounded-organic-xl transition-colors duration-fast ease-signature",
          isUnlocked
            ? cn(
                "cursor-pointer bg-surface-elevated hover:bg-surface",
                isCompleted && "opacity-90",
              )
            : "cursor-not-allowed bg-surface-mid opacity-60",
        )}
        onClick={handleCardClick}
      >
        {isCurrent && isUnlocked ? (
          <div
            className={cn(
              "absolute bottom-3 left-0 top-3 w-1 rounded-r-full",
              getExamAccentFillClass(stage.examName),
            )}
            aria-hidden
          />
        ) : null}

        <div className="flex items-center gap-3.5 p-4 sm:gap-4 sm:p-5">
          <div
            className={cn(
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-base font-bold tabular-nums transition-colors",
              isUnlocked
                ? getExamAccentFillClass(stage.examName)
                : "bg-surface-neutral text-text-disabled",
            )}
          >
            {isCompleted && isUnlocked ? (
              <Check className="h-4 w-4 stroke-[3]" aria-hidden />
            ) : isUnlocked ? (
              index + 1
            ) : (
              <Lock
                className="h-4 w-4 text-text-disabled"
                strokeWidth={2}
                aria-hidden
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    "text-base font-semibold sm:text-lg",
                    isUnlocked ? getExamAccentTextClass(stage.examName) : "text-text-disabled",
                  )}
                >
                  {stage.examName}
                </span>
                {stage.id === "specimen-papers" ? (
                  <span
                    className={cn(
                      "text-base font-medium sm:text-lg",
                      isUnlocked ? "text-text-muted" : "text-text-disabled",
                    )}
                  >
                    Specimen
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-base font-medium sm:text-lg",
                      isUnlocked ? "text-text-muted" : "text-text-disabled",
                    )}
                  >
                    {stage.year}
                  </span>
                )}
                {(() => {
                  const allSpecimen =
                    stage.parts.length > 0 &&
                    stage.parts.every((p) => p.examType === "Specimen");
                  const allOfficial =
                    stage.parts.length > 0 &&
                    stage.parts.every((p) => p.examType === "Official");
                  if (allSpecimen) {
                    return (
                      <span className="rounded-organic-sm bg-surface-mid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                        Specimen
                      </span>
                    );
                  }
                  if (allOfficial) {
                    return (
                      <span className="rounded-organic-sm bg-surface-mid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                        Official
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {totalCount > 0 ? (
                <div className="flex min-w-[5.5rem] items-center gap-2">
                  <div
                    className="h-1 flex-1 overflow-hidden rounded-full bg-surface-mid"
                    aria-hidden
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-signature",
                        getExamProgressFillClass(stage.examName),
                      )}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      isUnlocked ? "text-text-muted" : "text-text-disabled",
                    )}
                  >
                    {completedCount}/{totalCount}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            {isUnlocked ? (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ChevronDown
                  className="h-4 w-4 text-text-muted"
                  aria-hidden
                />
              </motion.div>
            ) : null}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && isUnlocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden bg-surface-mid"
            >
              <div className="p-4 pt-3 sm:p-5 sm:pt-4">
                <div
                  className={cn(
                    "space-y-3 rounded-organic-lg p-3",
                    getExamAccentSurfaceClass(stage.examName),
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-text-muted">
                      Select parts to practice
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-medium text-text-subtle underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      {(() => {
                        const incompleteCount = stage.parts.filter(
                          (part) =>
                            !(completionData.get(getPartKey(part)) || false),
                        ).length;
                        return selectedParts.size === incompleteCount &&
                          incompleteCount > 0
                          ? "Deselect All"
                          : "Select All Incomplete";
                      })()}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const partsBySection = new Map<string, RoadmapPart[]>();
                      stage.parts.forEach((part) => {
                        const sectionKey = part.paperName;
                        if (!partsBySection.has(sectionKey)) {
                          partsBySection.set(sectionKey, []);
                        }
                        partsBySection.get(sectionKey)!.push(part);
                      });

                      const order = [
                        "Section 1",
                        "Section 2",
                        "Paper 1",
                        "Paper 2",
                      ];
                      const sections = Array.from(partsBySection.keys()).sort(
                        (a, b) => {
                          const aIndex = order.indexOf(a);
                          const bIndex = order.indexOf(b);
                          if (aIndex !== -1 && bIndex !== -1)
                            return aIndex - bIndex;
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
                          return a.localeCompare(b);
                        },
                      );

                      return sections.map((sectionName) => {
                        const sectionParts =
                          partsBySection.get(sectionName) || [];
                        return (
                          <div key={sectionName} className="space-y-2">
                            <div className="flex items-center gap-2 px-1 py-1">
                              <ChevronRight
                                className="h-4 w-4 text-text-muted"
                                aria-hidden
                              />
                              <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                                {sectionName}
                              </span>
                            </div>

                            {sectionParts.length > 0 ? (
                              <div className="space-y-2 pl-1 sm:pl-3">
                                {sectionParts.map((part) => {
                                  const partKey = getPartKey(part);
                                  const isPartCompleted =
                                    completionData.get(partKey) || false;
                                  const isSelected = selectedParts.has(partKey);

                                  let displayLabel = "";
                                  if (stage.examName === "TMUA") {
                                    displayLabel = part.paperName;
                                  } else if (part.questionRange) {
                                    displayLabel = `${part.partLetter}: ${part.partName} (Q${part.questionRange.start}-${part.questionRange.end})`;
                                  } else {
                                    displayLabel = `${part.partLetter}: ${part.partName}`;
                                  }

                                  return (
                                    <div
                                      key={partKey}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handlePartToggle(partKey, {
                                            stopPropagation: () =>
                                              e.stopPropagation(),
                                          } as React.MouseEvent);
                                        }
                                      }}
                                      className="flex cursor-pointer items-center gap-3 rounded-organic-md bg-surface-elevated p-3 text-sm transition-colors duration-fast ease-signature hover:bg-surface"
                                      onClick={(e) => handlePartToggle(partKey, e)}
                                    >
                                      <div
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors duration-fast ease-signature",
                                          isSelected
                                            ? getExamAccentFillClass(stage.examName)
                                            : "bg-surface-mid",
                                        )}
                                      >
                                        {isSelected ? (
                                          <Check
                                            className="h-3.5 w-3.5 stroke-[3]"
                                            aria-hidden
                                          />
                                        ) : null}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-text">
                                          {displayLabel}
                                        </div>
                                        <div className="mt-0.5 text-xs text-text-muted">
                                          {part.examType}
                                        </div>
                                      </div>
                                      {isPartCompleted ? (
                                        <div
                                          className={cn(
                                            "flex shrink-0 items-center gap-1.5",
                                            getExamAccentTextClass(stage.examName),
                                          )}
                                        >
                                          <CheckCircle2
                                            className="h-5 w-5 shrink-0"
                                            strokeWidth={2.25}
                                            aria-hidden
                                          />
                                          <span className="text-xs font-medium">
                                            Done
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="pl-4 text-xs italic text-text-muted">
                                No parts from {sectionName.toLowerCase()}{" "}
                                applicable
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={selectedParts.size === 0}
                    className={cn(
                      "flex w-full items-center justify-center gap-3 rounded-organic-lg px-5 py-3 text-sm font-semibold transition-all duration-fast ease-signature",
                      selectedParts.size === 0
                        ? "cursor-not-allowed bg-surface-neutral text-text-disabled"
                        : cn(
                            getExamAccentFillClass(stage.examName),
                            "hover:brightness-110",
                          ),
                    )}
                  >
                    <span>Start Practice Session</span>
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
