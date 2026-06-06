/**
 * StageListCard — roadmap row + expansion (DESIGN.md tokens)
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  ChevronDown,
  ArrowRight,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getExamAccentTextClass,
  getExamAccentFillClass,
} from "@/config/colors";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import {
  ROADMAP_EXPAND_TRANSITION_CLASS,
  ROADMAP_TIMELINE_CONNECTOR_WIDTH,
} from "./roadmapTimelineLayout";

interface StageListCardProps {
  stage: RoadmapStage;
  index: number;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  completionData: Map<string, boolean>;
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  timelineNodeY?: number;
  /** Header row anchor — timeline nodes track this, not expanded body height. */
  anchorRef?: (el: HTMLDivElement | null) => void;
}

export function StageListCard({
  stage,
  index,
  completedCount,
  totalCount,
  isUnlocked,
  isExpanded,
  onToggleExpand,
  completionData,
  onStartSession,
  timelineNodeY,
  anchorRef,
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
    <div className="relative overflow-visible font-sans">
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-organic-lg transition-colors duration-fast ease-signature",
          isUnlocked
            ? "cursor-pointer bg-surface-elevated"
            : "cursor-not-allowed bg-surface-mid opacity-70",
        )}
        onClick={handleCardClick}
      >
        <div
          ref={anchorRef}
          className="relative flex items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
        >
          {timelineNodeY !== undefined ? (
            <div
              className="pointer-events-none absolute left-0 top-1/2 z-0 hidden -translate-x-full -translate-y-1/2 lg:block"
              style={{
                width: ROADMAP_TIMELINE_CONNECTOR_WIDTH,
                height: "1px",
                background:
                  "linear-gradient(to left, var(--color-border-subtle), transparent)",
              }}
            />
          ) : null}
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-organic-md text-lg font-bold tabular-nums",
              isUnlocked
                ? getExamAccentFillClass(stage.examName)
                : "bg-surface-neutral text-text-disabled",
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
            <div className="flex items-center justify-between gap-4">
              <p className="min-w-0">
                <span
                  className={cn(
                    "text-base font-semibold sm:text-lg",
                    isUnlocked ? getExamAccentTextClass(stage.examName) : "text-text-disabled",
                  )}
                >
                  {stage.examName}
                </span>
                <span
                  className={cn(
                    "ml-2 text-base font-medium sm:text-lg",
                    isUnlocked ? "text-text-muted" : "text-text-disabled",
                  )}
                >
                  {stage.id === "specimen-papers" ? "Specimen" : stage.year}
                </span>
              </p>

              {totalCount > 0 ? (
                <span
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    isUnlocked ? "text-text-muted" : "text-text-disabled",
                  )}
                >
                  {completedCount}/{totalCount}
                </span>
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
                  className="h-5 w-5 text-text-muted"
                  aria-hidden
                />
              </motion.div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] border-t border-border-subtle/40",
            ROADMAP_EXPAND_TRANSITION_CLASS,
            isExpanded && isUnlocked ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            isExpanded && isUnlocked ? "border-t" : "border-t-transparent",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-4 px-4 py-4 transition-opacity sm:px-5",
                ROADMAP_EXPAND_TRANSITION_CLASS,
                isExpanded && isUnlocked ? "opacity-100" : "opacity-0",
              )}
            >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted">
                    Select parts
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
                                      className="flex cursor-pointer items-center gap-3 rounded-organic-md bg-surface-mid px-3 py-2.5 text-sm transition-colors duration-fast ease-signature hover:bg-surface-neutral"
                                      onClick={(e) => handlePartToggle(partKey, e)}
                                    >
                                      <div
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors duration-fast ease-signature",
                                          isSelected
                                            ? getExamAccentFillClass(stage.examName)
                                            : "bg-surface-elevated",
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
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <span
                                            className={cn(
                                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                              getExamAccentFillClass(stage.examName),
                                            )}
                                            aria-hidden
                                          >
                                            <Check
                                              className="h-3 w-3 text-background dark:text-white"
                                              strokeWidth={3}
                                            />
                                          </span>
                                          <span className="text-xs font-medium text-text-muted">
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
                      "flex w-full items-center justify-center gap-2 rounded-organic-md px-4 py-3 text-sm font-semibold transition-all duration-fast ease-signature",
                      selectedParts.size === 0
                        ? "cursor-not-allowed bg-surface-neutral text-text-disabled"
                        : cn(
                            getExamAccentFillClass(stage.examName),
                            "hover:brightness-110",
                          ),
                    )}
                  >
                    <span>Start session</span>
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
