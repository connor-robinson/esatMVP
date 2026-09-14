/**
 * Past-papers practice table: click a paper to start with defaults;
 * use Download to expand PDFs and individual parts.
 */

"use client";

import { useMemo, useState } from "react";
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
  type RoadmapDisplayGroup,
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
import {
  getStageCommentary,
  type StageCommentary,
} from "./roadmapTimelineMarkers";
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

function commentaryForStage(
  stage: RoadmapStage,
  stages: RoadmapStage[],
): StageCommentary | null {
  if (stage.examName === "TMUA") {
    const firstTmua = stages.find((s) => s.examName === "TMUA");
    if (firstTmua?.id === stage.id) {
      return getStageCommentary("tmua-intro");
    }
    return null;
  }
  return getStageCommentary(stage.id);
}

/** Same defaults the old roadmap used when starting a stage. */
function getDefaultPartsForStage(
  stage: RoadmapStage,
  partCompletion: Map<string, boolean>,
): RoadmapPart[] {
  const getPartKey = getRoadmapPartKey;
  const displayGroups = groupRoadmapPartsForDisplay(stage.parts);

  if (stage.examName === "TMUA") {
    return defaultTmuaSelectedParts(stage, partCompletion, getPartKey);
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
    return expandDisplayGroupsToParts(stage.parts, keys);
  }

  const incomplete = displayGroups.filter(
    (group) => !isDisplayGroupCompleted(group, partCompletion, getPartKey),
  );
  const keys = new Set(
    (incomplete.length > 0 ? incomplete : displayGroups).map((g) => g.key),
  );
  return expandDisplayGroupsToParts(stage.parts, keys);
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
      className="inline-flex items-center gap-1.5 text-sm font-medium text-text underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Download className="h-3.5 w-3.5 opacity-70" aria-hidden />
      {label}
    </a>
  );
}

function StageDownloadPanel({
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

  const startGroup = (group: RoadmapDisplayGroup) => {
    onStartSession(
      stage,
      expandDisplayGroupsToParts(stage.parts, new Set([group.key])),
      { newQuestionsOnly },
    );
  };

  return (
    <div className="space-y-4 px-1 pb-4 pt-1 sm:px-2">
      {sectionDownloads.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Downloads
          </p>
          <ul className="space-y-2">
            {sectionDownloads.map(({ paperName, links }) => (
              <li
                key={paperName}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
              >
                <span className="min-w-[5.5rem] text-sm font-medium text-text">
                  {paperName}
                </span>
                {links.paperUrl ? (
                  <DownloadAnchor href={links.paperUrl} label="Paper PDF" />
                ) : null}
                {links.answersUrl ? (
                  <DownloadAnchor
                    href={links.answersUrl}
                    label={links.answersLabel}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          No PDF downloads for this paper yet.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          Practice one part
        </p>
        <ul className="divide-y divide-border-subtle/60">
          {displayGroups.map((group) => {
            const done = isDisplayGroupCompleted(
              group,
              partCompletion,
              getPartKey,
            );
            const links = getRoadmapPartSectionDownloads(
              stage,
              group.internalParts[0]!,
            );

            return (
              <li
                key={group.key}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-text">
                    {displayLabelForGroup(group)}
                    <span className="ml-2 text-text-muted">
                      {group.paperName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {done ? "Done" : "Not done"}
                    {links?.paperUrl || links?.answersUrl ? (
                      <>
                        {" · "}
                        {links.paperUrl ? (
                          <DownloadAnchor href={links.paperUrl} label="PDF" />
                        ) : null}
                        {links.paperUrl && links.answersUrl ? " · " : null}
                        {links.answersUrl ? (
                          <DownloadAnchor
                            href={links.answersUrl}
                            label={links.answersLabel}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startGroup(group)}
                  className="shrink-0 text-sm font-semibold text-primary hover:underline"
                >
                  Start part
                </button>
              </li>
            );
          })}
        </ul>
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

  const startStageDefaults = (stage: RoadmapStage) => {
    const parts = getDefaultPartsForStage(
      stage,
      completionData.get(stage.id)?.parts ?? new Map(),
    );
    if (parts.length === 0) return;
    onStartSession(stage, parts, { newQuestionsOnly });
  };

  return (
    <div className="font-sans">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
            Past papers
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {completionLoading ? (
              <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-mid" />
            ) : (
              <>
                {totals.completed} of {totals.total} parts done. Click a paper to
                start.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="pb-2.5 pr-4 font-medium">Paper</th>
              <th className="w-[4.5rem] pb-2.5 pr-4 font-medium">Parts</th>
              <th className="w-[7rem] pb-2.5 pr-4 font-medium">Status</th>
              <th className="w-[4.5rem] pb-2.5 pr-4 font-medium">Score</th>
              <th className="w-[6.5rem] pb-2.5 text-right font-medium">
                Download
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => {
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
              const commentary = commentaryForStage(stage, stages);

              return (
                <tr
                  key={stage.id}
                  data-stage-id={stage.id}
                  className="align-top"
                >
                  <td
                    colSpan={5}
                    className={cn(
                      "p-0",
                      index < stages.length - 1 && "border-b border-border-subtle",
                    )}
                  >
                    <div
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_4.5rem_7rem_4.5rem_6.5rem] items-start gap-x-0 py-3.5 pr-0",
                        isExpanded && "pb-1",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => startStageDefaults(stage)}
                        className="min-w-0 pr-4 text-left transition-opacity hover:opacity-80"
                      >
                        <span
                          className={cn(
                            "block text-base font-semibold leading-snug",
                            getExamAccentTextClass(accentExam),
                          )}
                        >
                          {stageTitle(stage)}
                        </span>
                        {commentary ? (
                          <span className="mt-1 block text-sm leading-relaxed text-text-muted">
                            {commentary.text}
                          </span>
                        ) : null}
                      </button>

                      <button
                        type="button"
                        onClick={() => startStageDefaults(stage)}
                        className="pt-0.5 text-left tabular-nums text-text hover:opacity-80"
                      >
                        {completed}/{total}
                      </button>

                      <button
                        type="button"
                        onClick={() => startStageDefaults(stage)}
                        className="pt-0.5 text-left text-text hover:opacity-80"
                      >
                        {isDone ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            Done
                          </span>
                        ) : isPartial ? (
                          "In progress"
                        ) : (
                          <span className="text-text-muted">Not started</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => startStageDefaults(stage)}
                        className="pt-0.5 text-left tabular-nums text-text hover:opacity-80"
                      >
                        {scoresLoading ? (
                          <span className="inline-block h-3.5 w-8 animate-pulse rounded bg-surface-mid" />
                        ) : (
                          formatRoadmapScore(score)
                        )}
                      </button>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : stage.id)
                          }
                          aria-expanded={isExpanded}
                          aria-label={`Download options for ${stageTitle(stage)}`}
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-text",
                            isExpanded && "text-text",
                          )}
                        >
                          Download
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-fast ease-signature",
                              isExpanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <StageDownloadPanel
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
        <p className="py-10 text-center text-sm text-text-muted">
          No papers match your subjects yet. Set ESAT modules in your profile.
        </p>
      ) : null}
    </div>
  );
}
