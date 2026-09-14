/**
 * Minimal past-papers roadmap table: expand rows to practice or download sections.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExamAccentTextClass } from "@/config/colors";
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
import {
  getRoadmapPartSectionDownloads,
  getRoadmapStageSectionDownloads,
} from "@/lib/papers/roadmapDownloads";
import {
  formatRoadmapScore,
  type RoadmapStageScore,
} from "@/lib/papers/roadmapStageScores";
import { RoadmapInfoPopover } from "./RoadmapInfoPopover";
import type { RoadmapStartOptions } from "./StageListCard";

type StageCompletionEntry = {
  completed: number;
  total: number;
  parts: Map<string, boolean>;
};

type Props = {
  stages: RoadmapStage[];
  completionData: Map<string, StageCompletionEntry>;
  stageScores: Map<string, RoadmapStageScore>;
  completionLoading?: boolean;
  scoresLoading?: boolean;
  newQuestionsOnly: boolean;
  onNewQuestionsOnlyChange: (enabled: boolean) => void;
  onStartSession: (
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

function DownloadAnchor({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1 text-xs font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Download className="h-3 w-3" aria-hidden />
      {label}
    </a>
  );
}

function StageExpandedBody({
  stage,
  partCompletion,
  newQuestionsOnly,
  onStartSession,
}: {
  stage: RoadmapStage;
  partCompletion: Map<string, boolean>;
  newQuestionsOnly: boolean;
  onStartSession: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
}) {
  const getPartKey = getRoadmapPartKey;
  const displayGroups = useMemo(
    () => groupRoadmapPartsForDisplay(stage.parts),
    [stage.parts],
  );
  const sectionDownloads = useMemo(
    () => getRoadmapStageSectionDownloads(stage),
    [stage],
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
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
          !isDisplayGroupCompleted(group, partCompletion, getPartKey)
        ) {
          keys.add(group.key);
        }
      }
      setSelectedGroups(keys);
      return;
    }

    const incomplete = displayGroups.filter(
      (group) => !isDisplayGroupCompleted(group, partCompletion, getPartKey),
    );
    setSelectedGroups(new Set(incomplete.map((group) => group.key)));
  }, [stage, partCompletion, displayGroups, getPartKey]);

  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startSelected = () => {
    if (selectedGroups.size === 0) return;
    const parts = expandDisplayGroupsToParts(stage.parts, selectedGroups);
    onStartSession(stage, parts, { newQuestionsOnly });
  };

  const startGroup = (groupKey: string) => {
    const parts = expandDisplayGroupsToParts(
      stage.parts,
      new Set([groupKey]),
    );
    onStartSession(stage, parts, { newQuestionsOnly });
  };

  return (
    <div className="space-y-4 border-t border-border-subtle bg-surface-mid/30 px-3 py-3 sm:px-4">
      {sectionDownloads.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sectionDownloads.map(({ paperName, links }) => (
            <div
              key={paperName}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
            >
              <span className="font-medium text-text">{paperName}</span>
              {links.paperUrl ? (
                <DownloadAnchor href={links.paperUrl} label="Paper PDF" />
              ) : null}
              {links.answersUrl ? (
                <DownloadAnchor
                  href={links.answersUrl}
                  label={links.answersLabel}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="w-8 py-1.5 pr-2 font-medium" />
              <th className="py-1.5 pr-3 font-medium">Part</th>
              <th className="py-1.5 pr-3 font-medium">Section</th>
              <th className="py-1.5 pr-3 font-medium">Status</th>
              <th className="py-1.5 pr-3 font-medium">Download</th>
              <th className="py-1.5 text-right font-medium">Practice</th>
            </tr>
          </thead>
          <tbody>
            {displayGroups.map((group) => {
              const done = isDisplayGroupCompleted(
                group,
                partCompletion,
                getPartKey,
              );
              const selected = selectedGroups.has(group.key);
              const links = getRoadmapPartSectionDownloads(
                stage,
                group.internalParts[0]!,
              );

              return (
                <tr
                  key={group.key}
                  className="border-t border-border-subtle/70"
                >
                  <td className="py-2 pr-2 align-middle">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGroup(group.key)}
                      aria-label={`Select ${displayLabelForGroup(group)}`}
                      className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                    />
                  </td>
                  <td className="py-2 pr-3 align-middle text-text">
                    {displayLabelForGroup(group)}
                  </td>
                  <td className="py-2 pr-3 align-middle text-text-muted">
                    {group.paperName}
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-text">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Done
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">Not done</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {links?.paperUrl ? (
                        <DownloadAnchor href={links.paperUrl} label="PDF" />
                      ) : null}
                      {links?.answersUrl ? (
                        <DownloadAnchor
                          href={links.answersUrl}
                          label={links.answersLabel}
                        />
                      ) : null}
                      {!links?.paperUrl && !links?.answersUrl ? (
                        <span className="text-xs text-text-subtle">-</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 text-right align-middle">
                    <button
                      type="button"
                      onClick={() => startGroup(group.key)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Start
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs text-text-muted">
          {selectedGroups.size} part
          {selectedGroups.size === 1 ? "" : "s"} selected
        </p>
        <button
          type="button"
          disabled={selectedGroups.size === 0}
          onClick={startSelected}
          className={cn(
            "rounded border px-3 py-1.5 text-sm font-semibold transition-colors",
            selectedGroups.size > 0
              ? "border-primary bg-primary text-white hover:bg-primary-hover"
              : "cursor-not-allowed border-border-subtle bg-surface-mid text-text-disabled",
          )}
        >
          Start selected
        </button>
      </div>
    </div>
  );
}

export function RoadmapTable({
  stages,
  completionData,
  stageScores,
  completionLoading = false,
  scoresLoading = false,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onStartSession,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totals = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const stage of stages) {
      const data = completionData.get(stage.id);
      completed += data?.completed ?? 0;
      total += data?.total ?? groupRoadmapPartsForDisplay(stage.parts).length;
    }
    return { completed, total };
  }, [stages, completionData]);

  return (
    <div className="font-sans">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
            Past papers
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {completionLoading ? (
              <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-mid" />
            ) : (
              <>
                {totals.completed} of {totals.total} parts done
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-subtle">
            Unique questions only
          </span>
          <RoadmapInfoPopover title="Unique questions only">
            <p>
              When on, sessions only include questions you have not tried
              before.
            </p>
            <p>
              Some ENGAA papers overlap with NSAA. Matching questions you already
              did are skipped too.
            </p>
          </RoadmapInfoPopover>
          <button
            type="button"
            role="switch"
            aria-checked={newQuestionsOnly}
            aria-label="Unique questions only"
            onClick={() => onNewQuestionsOnlyChange(!newQuestionsOnly)}
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast ease-signature",
              newQuestionsOnly ? "bg-primary" : "bg-surface-neutral",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-fast ease-signature",
                newQuestionsOnly ? "left-[16px]" : "left-0.5",
              )}
            />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border-subtle bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-mid/50 text-xs uppercase tracking-wide text-text-subtle">
                <th className="px-3 py-2.5 font-medium sm:px-4">Paper</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">Progress</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">Status</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">Score</th>
                <th className="w-10 px-3 py-2.5 sm:px-4" />
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => {
                const data = completionData.get(stage.id);
                const completed = data?.completed ?? 0;
                const total =
                  data?.total ??
                  groupRoadmapPartsForDisplay(stage.parts).length;
                const isDone = total > 0 && completed === total;
                const isPartial = completed > 0 && !isDone;
                const isExpanded = expandedId === stage.id;
                const accentExam = isEsatCampMockRoadmapStage(stage)
                  ? "ESATCamp Mock"
                  : stage.examName;
                const score = stageScores.get(stage.id);

                return (
                  <tr key={stage.id} data-stage-id={stage.id} className="group">
                    <td colSpan={5} className="p-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : stage.id)
                        }
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_2.5rem] items-center gap-0 border-b border-border-subtle px-3 py-2.5 text-left transition-colors sm:px-4",
                          isExpanded
                            ? "bg-surface-mid/40"
                            : "hover:bg-surface-mid/25",
                        )}
                        aria-expanded={isExpanded}
                      >
                        <span
                          className={cn(
                            "truncate font-medium",
                            getExamAccentTextClass(accentExam),
                          )}
                        >
                          {stageTitle(stage)}
                        </span>
                        <span className="tabular-nums text-text-muted">
                          {completed}/{total}
                        </span>
                        <span className="text-text-muted">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-text">
                              <Check className="h-3.5 w-3.5" aria-hidden />
                              Done
                            </span>
                          ) : isPartial ? (
                            "In progress"
                          ) : (
                            "Not started"
                          )}
                        </span>
                        <span className="tabular-nums text-text">
                          {scoresLoading ? (
                            <span className="inline-block h-3.5 w-8 animate-pulse rounded bg-surface-mid" />
                          ) : (
                            formatRoadmapScore(score)
                          )}
                        </span>
                        <span className="flex justify-end">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-text-muted transition-transform duration-fast ease-signature",
                              isExpanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </span>
                      </button>

                      {isExpanded ? (
                        <StageExpandedBody
                          stage={stage}
                          partCompletion={data?.parts ?? new Map()}
                          newQuestionsOnly={newQuestionsOnly}
                          onStartSession={onStartSession}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {stages.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            No papers match your subjects yet. Set ESAT modules in your profile.
          </p>
        ) : null}
      </div>
    </div>
  );
}
