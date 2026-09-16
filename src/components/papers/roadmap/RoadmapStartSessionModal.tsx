/**
 * Start-session popup for a roadmap paper (navy past-papers styling).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import { isEsatCampMockRoadmapStage } from "@/lib/papers/roadmapConfig";
import { getRoadmapPartKey } from "@/lib/papers/roadmapPartKey";
import { defaultTmuaSelectedParts } from "@/lib/papers/tmuaRoadmapParts";
import {
  displayLabelForGroup,
  expandDisplayGroupsToParts,
  groupRoadmapPartsForDisplay,
  isDisplayGroupCompleted,
} from "@/lib/papers/roadmapDisplayGroups";
import { RoadmapInfoPopover } from "./RoadmapInfoPopover";
import type { RoadmapStartOptions } from "./StageListCard";

type Props = {
  open: boolean;
  stage: RoadmapStage | null;
  partCompletion: Map<string, boolean>;
  newQuestionsOnly: boolean;
  onNewQuestionsOnlyChange: (enabled: boolean) => void;
  onClose: () => void;
  onStart: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
};

function stageTitle(stage: RoadmapStage): string {
  if (isEsatCampMockRoadmapStage(stage)) {
    return stage.label || "ESATCamp Mock";
  }
  if (stage.id === "specimen-papers") {
    return `${stage.examName} Specimen`;
  }
  return `${stage.examName} ${stage.year}`;
}

function defaultSelectedGroupKeys(
  stage: RoadmapStage,
  partCompletion: Map<string, boolean>,
): Set<string> {
  const getPartKey = getRoadmapPartKey;
  const displayGroups = groupRoadmapPartsForDisplay(stage.parts);

  if (stage.examName === "TMUA") {
    const defaultParts = defaultTmuaSelectedParts(
      stage,
      partCompletion,
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
    return keys;
  }

  if (stage.examName === "ENGAA") {
    const keys = new Set<string>();
    for (const group of displayGroups) {
      const startsSelected = group.internalParts.some(
        (part) => part.defaultSelected !== false,
      );
      if (
        startsSelected &&
        !isDisplayGroupCompleted(group, partCompletion, getPartKey)
      ) {
        keys.add(group.key);
      }
    }
    if (keys.size === 0) {
      for (const group of displayGroups) {
        if (!isDisplayGroupCompleted(group, partCompletion, getPartKey)) {
          keys.add(group.key);
        }
      }
    }
    return keys;
  }

  const incomplete = displayGroups.filter(
    (group) => !isDisplayGroupCompleted(group, partCompletion, getPartKey),
  );
  return new Set(
    (incomplete.length > 0 ? incomplete : displayGroups).map((g) => g.key),
  );
}

export function RoadmapStartSessionModal({
  open,
  stage,
  partCompletion,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onClose,
  onStart,
}: Props) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const displayGroups = useMemo(
    () => (stage ? groupRoadmapPartsForDisplay(stage.parts) : []),
    [stage],
  );

  useEffect(() => {
    if (!open || !stage) return;
    setSelectedGroups(defaultSelectedGroupKeys(stage, partCompletion));
  }, [open, stage, partCompletion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !stage) return null;

  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStart = () => {
    if (selectedGroups.size === 0) return;
    const parts = expandDisplayGroupsToParts(stage.parts, selectedGroups);
    onStart(stage, parts, { newQuestionsOnly });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-start-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-[101] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-sm bg-[#161D2F]">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2
              id="roadmap-start-title"
              className="text-lg font-semibold text-[#F1F5F9]"
            >
              Start session
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">{stageTitle(stage)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F1F5F9]"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Sections
            </span>
            <span className="text-xs text-[#94A3B8]">
              {selectedGroups.size} selected
            </span>
          </div>

          <ul className="space-y-1">
            {displayGroups.map((group) => {
              const selected = selectedGroups.has(group.key);
              const done = isDisplayGroupCompleted(
                group,
                partCompletion,
                getRoadmapPartKey,
              );
              return (
                <li key={group.key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 transition-colors",
                      selected
                        ? "bg-white/[0.06]"
                        : "hover:bg-white/[0.03]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGroup(group.key)}
                      className="h-4 w-4 accent-[#3B82F6]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[#F1F5F9]">
                        {displayLabelForGroup(group)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#94A3B8]">
                        {group.paperName}
                        {done ? " · Done" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#CBD5E1]">
                Unique questions only
              </span>
              <RoadmapInfoPopover
                title="Unique questions only"
                panelClassName="bg-[#1B2438]"
              >
                <p>
                  When on, sessions skip questions you have already tried
                  (including NSAA / ENGAA overlaps).
                </p>
              </RoadmapInfoPopover>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={newQuestionsOnly}
              aria-label="Unique questions only"
              onClick={() => onNewQuestionsOnlyChange(!newQuestionsOnly)}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-sm transition-colors",
                newQuestionsOnly ? "bg-[#3B82F6]/80" : "bg-[#334155]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-sm bg-white transition-transform",
                  newQuestionsOnly ? "left-[16px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedGroups.size === 0}
            onClick={handleStart}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-semibold transition-colors",
              selectedGroups.size > 0
                ? "bg-[#3B82F6]/85 text-white hover:bg-[#3B82F6]"
                : "cursor-not-allowed bg-[#334155] text-[#94A3B8]",
            )}
          >
            Start session
            <Play className="h-3.5 w-3.5 fill-current opacity-90" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
