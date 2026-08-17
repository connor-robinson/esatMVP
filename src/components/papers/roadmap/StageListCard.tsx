/**
 * StageListCard — roadmap row + expansion (DESIGN.md tokens)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { getRoadmapPartKey } from "@/lib/papers/roadmapPartKey";
import { defaultTmuaSelectedParts } from "@/lib/papers/tmuaRoadmapParts";
import {
  groupRoadmapPartsForDisplay,
  expandDisplayGroupsToParts,
  isDisplayGroupCompleted,
  displayLabelForGroup,
} from "@/lib/papers/roadmapDisplayGroups";
import { RoadmapInfoPopover } from "./RoadmapInfoPopover";
import {
  ROADMAP_EXPAND_TRANSITION_CLASS,
  ROADMAP_TIMELINE_CONNECTOR_WIDTH,
} from "./roadmapTimelineLayout";

export type RoadmapLockReason = "progression" | "paywall";

export type RoadmapStartOptions = {
  newQuestionsOnly: boolean;
};

interface StageListCardProps {
  stage: RoadmapStage;
  index: number;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  lockReason?: RoadmapLockReason | null;
  onUnlockNow?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  completionData: Map<string, boolean>;
  onStartSession: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
  newQuestionsOnly: boolean;
  onNewQuestionsOnlyChange: (enabled: boolean) => void;
  timelineNodeY?: number;
  isStageCompleted?: boolean;
  /** Header row anchor — timeline nodes track this, not expanded body height. */
  anchorRef?: (el: HTMLDivElement | null) => void;
}

export function StageListCard({
  stage,
  index,
  completedCount,
  totalCount,
  isUnlocked,
  lockReason = null,
  onUnlockNow,
  isExpanded,
  onToggleExpand,
  completionData,
  onStartSession,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  timelineNodeY,
  isStageCompleted = false,
  anchorRef,
}: StageListCardProps) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const getPartKey = getRoadmapPartKey;
  const displayGroups = useMemo(
    () => groupRoadmapPartsForDisplay(stage.parts),
    [stage.parts],
  );

  useEffect(() => {
    if (stage.examName === "TMUA") {
      const defaultParts = defaultTmuaSelectedParts(
        stage,
        completionData,
        getPartKey,
      );
      const keys = new Set<string>();
      for (const group of displayGroups) {
        if (
          group.internalParts.some((part) =>
            defaultParts.some(
              (selected) => getPartKey(selected) === getPartKey(part),
            ),
          )
        ) {
          keys.add(group.key);
        }
      }
      setSelectedGroups(keys);
      return;
    }

    if (stage.examName === "ENGAA") {
      const keys = new Set<string>();
      for (const group of displayGroups) {
        const startsSelected = group.internalParts.some(
          (part) => part.defaultSelected !== false,
        );
        if (
          startsSelected &&
          !isDisplayGroupCompleted(group, completionData, getPartKey)
        ) {
          keys.add(group.key);
        }
      }
      setSelectedGroups(keys);
      return;
    }

    const incompleteGroups = displayGroups.filter(
      (group) => !isDisplayGroupCompleted(group, completionData, getPartKey),
    );
    setSelectedGroups(new Set(incompleteGroups.map((group) => group.key)));
  }, [stage, completionData, displayGroups]);

  const handleCardClick = () => {
    onToggleExpand();
  };

  const handleGroupToggle = (groupKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedGroups);
    if (next.has(groupKey)) next.delete(groupKey);
    else next.add(groupKey);
    setSelectedGroups(next);
  };

  const handleStartSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked && selectedGroups.size > 0) {
      const selectedPartsList = expandDisplayGroupsToParts(
        stage.parts,
        selectedGroups,
      );
      onStartSession(stage, selectedPartsList, { newQuestionsOnly });
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const incompleteGroups = displayGroups.filter(
      (group) => !isDisplayGroupCompleted(group, completionData, getPartKey),
    );

    if (
      selectedGroups.size === incompleteGroups.length &&
      incompleteGroups.length > 0
    ) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(incompleteGroups.map((group) => group.key)));
    }
  };

  return (
    <div className="relative overflow-visible font-sans">
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-organic-lg transition-colors duration-fast ease-signature",
          isUnlocked
            ? "cursor-pointer bg-surface-elevated"
            : "cursor-pointer bg-surface-mid opacity-70",
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
              style={{ width: ROADMAP_TIMELINE_CONNECTOR_WIDTH }}
            >
              <div
                className={cn(
                  "absolute right-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full",
                  isStageCompleted
                    ? getExamAccentFillClass(stage.examName)
                    : "bg-border-subtle/40",
                )}
                style={{
                  maskImage:
                    "linear-gradient(to left, transparent 0%, black 28%, black 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to left, transparent 0%, black 28%, black 100%)",
                }}
              />
            </div>
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

            {!isUnlocked && lockReason === "progression" && onUnlockNow ? (
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                Finish above papers to unlock, or{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockNow();
                  }}
                  className={cn(
                    "font-semibold underline-offset-2 transition-opacity hover:underline",
                    getExamAccentTextClass(stage.examName),
                  )}
                >
                  unlock now
                </button>
              </p>
            ) : null}
            {!isUnlocked && lockReason === "progression" && !onUnlockNow ? (
              <p className="mt-1 text-xs text-text-muted">
                Finish above papers to unlock
              </p>
            ) : null}
            {!isUnlocked && lockReason === "paywall" ? (
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                <Link
                  href="/pricing"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "font-semibold underline-offset-2 transition-opacity hover:underline",
                    getExamAccentTextClass(stage.examName),
                  )}
                >
                  Upgrade to unlock
                </Link>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ChevronDown
                className={cn(
                  "h-5 w-5",
                  isUnlocked ? "text-text-muted" : "text-text-disabled",
                )}
                aria-hidden
              />
            </motion.div>
          </div>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] border-t border-border-subtle/40",
            ROADMAP_EXPAND_TRANSITION_CLASS,
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            isExpanded ? "border-t" : "border-t-transparent",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-4 px-4 py-4 transition-opacity sm:px-5",
                ROADMAP_EXPAND_TRANSITION_CLASS,
                isExpanded ? "opacity-100" : "opacity-0",
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
                        const incompleteGroups = displayGroups.filter(
                          (group) =>
                            !isDisplayGroupCompleted(
                              group,
                              completionData,
                              getPartKey,
                            ),
                        );
                        return selectedGroups.size === incompleteGroups.length &&
                          incompleteGroups.length > 0
                          ? "Deselect All"
                          : "Select All Incomplete";
                      })()}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const groupsBySection = new Map<
                        string,
                        typeof displayGroups
                      >();
                      displayGroups.forEach((group) => {
                        const sectionKey = group.paperName;
                        if (!groupsBySection.has(sectionKey)) {
                          groupsBySection.set(sectionKey, []);
                        }
                        groupsBySection.get(sectionKey)!.push(group);
                      });

                      const order = [
                        "Section 1",
                        "Section 2",
                        "Paper 1",
                        "Paper 2",
                      ];
                      const sections = Array.from(groupsBySection.keys()).sort(
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
                        const sectionGroups =
                          groupsBySection.get(sectionName) || [];
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

                            {sectionGroups.length > 0 ? (
                              <div className="space-y-2 pl-1 sm:pl-3">
                                {sectionGroups.map((group) => {
                                  const isGroupCompleted =
                                    isDisplayGroupCompleted(
                                      group,
                                      completionData,
                                      getPartKey,
                                    );
                                  const isSelected = selectedGroups.has(
                                    group.key,
                                  );
                                  const displayLabel =
                                    stage.examName === "TMUA"
                                      ? group.paperName
                                      : displayLabelForGroup(group);

                                  return (
                                    <div
                                      key={group.key}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleGroupToggle(group.key, {
                                            stopPropagation: () =>
                                              e.stopPropagation(),
                                          } as React.MouseEvent);
                                        }
                                      }}
                                      className="flex cursor-pointer items-center gap-3 rounded-organic-md bg-surface-mid px-3 py-2.5 text-sm transition-colors duration-fast ease-signature hover:bg-surface-neutral"
                                      onClick={(e) =>
                                        handleGroupToggle(group.key, e)
                                      }
                                    >
                                      <div
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors duration-fast ease-signature",
                                          isSelected
                                            ? getExamAccentFillClass(
                                                stage.examName,
                                              )
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
                                          {group.examType}
                                        </div>
                                      </div>
                                      {isGroupCompleted ? (
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <span
                                            className={cn(
                                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                              getExamAccentFillClass(
                                                stage.examName,
                                              ),
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

                  <div
                    className="flex items-center justify-between gap-3 rounded-organic-md bg-surface-mid px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text">
                          Unique questions only
                        </span>
                        <RoadmapInfoPopover title="Unique questions only">
                          <p>
                            When on, your session only includes questions you
                            have not tried before.
                          </p>
                          <p>
                            Some ENGAA papers overlap with NSAA because certain
                            years used the same question banks. If you have
                            already done the matching NSAA question, we skip it
                            here too.
                          </p>
                        </RoadmapInfoPopover>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={newQuestionsOnly}
                      aria-label="Unique questions only"
                      onClick={() =>
                        onNewQuestionsOnlyChange(!newQuestionsOnly)
                      }
                      className={cn(
                        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-fast ease-signature",
                        newQuestionsOnly
                          ? "bg-accent"
                          : "bg-surface-neutral",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-fast ease-signature",
                          newQuestionsOnly ? "left-6" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  {stage.examName === "ENGAA" ? (
                    <div className="rounded-organic-md bg-surface-mid/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-text-subtle">
                          ENGAA overlap with NSAA
                        </span>
                        <RoadmapInfoPopover
                          title="How ENGAA fits the roadmap"
                          align="left"
                        >
                          <p>
                            Some ENGAA parts overlap with NSAA, so those start
                            unchecked. Tick them if you still want to sit the
                            full paper.
                          </p>
                          <p>
                            2016 to 2019: Section 1 Part A overlaps NSAA.
                            2020 to 2023: Section 2 overlaps NSAA.
                          </p>
                        </RoadmapInfoPopover>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={!isUnlocked || selectedGroups.size === 0}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-organic-md px-4 py-3 text-sm font-semibold transition-all duration-fast ease-signature",
                      !isUnlocked || selectedGroups.size === 0
                        ? "cursor-not-allowed bg-surface-neutral text-text-disabled"
                        : cn(
                            getExamAccentFillClass(stage.examName),
                            "hover:brightness-110",
                          ),
                    )}
                  >
                    <span>
                      {isUnlocked
                        ? "Start session"
                        : lockReason === "paywall"
                          ? "Upgrade to unlock"
                          : "Locked"}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
