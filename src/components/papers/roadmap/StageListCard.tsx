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
  getExamAccentBadgeClass,
  getExamAccentTextClass,
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

  return (
    <div className="relative overflow-visible">
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
          "relative flex flex-col overflow-hidden rounded-organic-xl border bg-surface-elevated ring-1 ring-white/[0.06] transition-colors duration-fast ease-signature",
          isUnlocked
            ? cn(
                "cursor-pointer border-border",
                isCurrent && "border-primary/30 ring-primary/20",
              )
            : "cursor-not-allowed border-border-subtle opacity-75",
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <div
            className={cn(
              "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-organic-md font-mono text-lg font-bold transition-colors tabular-nums",
              isUnlocked
                ? cn(
                    isCompleted || isCurrent
                      ? getExamAccentBadgeClass(stage.examName)
                      : "border border-border-subtle bg-surface-mid text-text",
                  )
                : "border border-border-subtle bg-surface-mid text-text-disabled",
            )}
          >
            {isUnlocked ? (
              index + 1
            ) : (
              <Lock
                className="h-5 w-5 text-text-disabled"
                strokeWidth={2}
                aria-hidden
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-1 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span
                  className={cn(
                    "font-mono text-lg font-semibold tracking-wide sm:text-xl",
                    isUnlocked ? getExamAccentTextClass(stage.examName) : "text-text-disabled",
                  )}
                >
                  {stage.examName}
                </span>
                {stage.id === "specimen-papers" ? (
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tracking-wide sm:text-xl",
                      isUnlocked ? "text-text-muted" : "text-text-disabled",
                    )}
                  >
                    Specimen
                  </span>
                ) : (
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tracking-wide text-text-muted sm:text-xl",
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
                      <span className="rounded-organic-sm border border-border-subtle bg-surface-mid px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Specimen
                      </span>
                    );
                  }
                  if (allOfficial) {
                    return (
                      <span className="rounded-organic-sm border border-border-subtle bg-surface-mid px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Official
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {totalCount > 0 ? (
                <div
                  className={cn(
                    "flex-shrink-0 whitespace-nowrap font-mono text-[0.85rem]",
                    isUnlocked ? "text-text-muted" : "text-text-disabled",
                  )}
                >
                  {completedCount}/{totalCount} parts completed
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            {!isUnlocked ? (
              <Lock className="h-5 w-5 text-text-disabled" aria-hidden />
            ) : (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ChevronDown
                  className="h-5 w-5 text-text-muted"
                  aria-hidden
                />
              </motion.div>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && isUnlocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden border-t border-border-subtle"
            >
              <div className="p-5 pt-4 sm:p-6 sm:pt-5">
                <div className="space-y-3 rounded-organic-lg border border-border-subtle bg-surface-mid p-4 ring-1 ring-white/[0.04]">
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
                                      className="flex cursor-pointer items-center gap-3 rounded-organic-md border border-transparent bg-surface-elevated p-3 text-sm transition-colors duration-fast ease-signature hover:border-border-subtle hover:bg-surface"
                                      onClick={(e) => handlePartToggle(partKey, e)}
                                    >
                                      <div
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-fast ease-signature",
                                          isSelected
                                            ? "border-accent/35 bg-accent text-background"
                                            : "border-border-subtle bg-surface-mid",
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
                                        <div className="flex shrink-0 items-center gap-1.5 text-primary">
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
                      "flex w-full items-center justify-center gap-3 rounded-organic-lg border px-6 py-3.5 text-sm font-semibold transition-all duration-fast ease-signature",
                      selectedParts.size === 0
                        ? "cursor-not-allowed border-border-subtle bg-surface-mid text-text-disabled"
                        : "border-border-subtle bg-surface-mid text-text hover:border-border hover:bg-surface-neutral",
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
