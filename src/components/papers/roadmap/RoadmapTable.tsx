/**
 * Past-papers practice table: click a paper name for start options;
 * info buttons show roadmap commentary; Download expands PDFs.
 */

"use client";

import { useMemo, useState, Fragment } from "react";
import { ChevronDown, Download } from "lucide-react";
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
import {
  markPartAsCompleted,
  setRoadmapStageManualStatus,
  unmarkPartAsCompleted,
  type ManualRoadmapStatus,
} from "@/lib/papers/roadmapCompletion";
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

type ExpandMode = "options" | "downloads";

type Props = {
  stages: RoadmapStage[];
  completionData: Map<string, StageCompletionEntry>;
  stageScores: Map<string, RoadmapStageScore>;
  completionLoading?: boolean;
  scoresLoading?: boolean;
  userId: string | null;
  newQuestionsOnly: boolean;
  onNewQuestionsOnlyChange: (enabled: boolean) => void;
  onStartSession: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
  onCompletionChange: () => void | Promise<void>;
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

function describeDefaultSections(
  stage: RoadmapStage,
  defaultParts: RoadmapPart[],
): string[] {
  const groups = groupRoadmapPartsForDisplay(defaultParts);
  if (groups.length === 0) return [];
  return groups.map((group) => {
    const label = displayLabelForGroup(group);
    return group.paperName ? `${label} (${group.paperName})` : label;
  });
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
      className="inline-flex items-center gap-1.5 rounded-md bg-surface-mid px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-neutral"
      onClick={(e) => e.stopPropagation()}
    >
      <Download className="h-3.5 w-3.5 opacity-70" aria-hidden />
      {label}
    </a>
  );
}

function StageOptionsPanel({
  stage,
  partCompletion,
  newQuestionsOnly,
  mode,
  userId,
  statusBusy,
  onStartSession,
  onCompletionChange,
}: {
  stage: RoadmapStage;
  partCompletion: Map<string, boolean>;
  newQuestionsOnly: boolean;
  mode: ExpandMode;
  userId: string | null;
  statusBusy: boolean;
  onStartSession: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
  onCompletionChange: () => void | Promise<void>;
}) {
  const getPartKey = getRoadmapPartKey;
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const displayGroups = useMemo(
    () => groupRoadmapPartsForDisplay(stage.parts),
    [stage.parts],
  );
  const sectionDownloads = useMemo(
    () => getRoadmapStageSectionDownloads(stage),
    [stage],
  );
  const defaultParts = useMemo(
    () => getDefaultPartsForStage(stage, partCompletion),
    [stage, partCompletion],
  );
  const sectionSummary = useMemo(
    () => describeDefaultSections(stage, defaultParts),
    [stage, defaultParts],
  );

  const startDefaults = () => {
    if (defaultParts.length === 0) return;
    onStartSession(stage, defaultParts, { newQuestionsOnly });
  };

  const startGroup = (group: RoadmapDisplayGroup) => {
    onStartSession(
      stage,
      expandDisplayGroupsToParts(stage.parts, new Set([group.key])),
      { newQuestionsOnly },
    );
  };

  const setGroupDone = async (group: RoadmapDisplayGroup, done: boolean) => {
    if (!userId || statusBusy) return;
    setMarkingKey(group.key);
    try {
      for (const part of group.internalParts) {
        const ok = done
          ? await markPartAsCompleted(
              userId,
              stage.examName,
              stage.year,
              part,
            )
          : await unmarkPartAsCompleted(
              userId,
              stage.examName,
              stage.year,
              part,
            );
        if (!ok) break;
      }
      await onCompletionChange();
    } finally {
      setMarkingKey(null);
    }
  };

  return (
    <div className="space-y-5 px-4 py-4 sm:px-5">
      {mode === "options" ? (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-mid/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Start paper now</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              {sectionSummary.length > 0 ? (
                <>
                  Includes:{" "}
                  <span className="text-text">{sectionSummary.join(" · ")}</span>
                </>
              ) : (
                "No incomplete sections left. You can still start an individual part below."
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={defaultParts.length === 0}
            onClick={startDefaults}
            className={cn(
              "shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              defaultParts.length > 0
                ? "bg-primary text-white hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-neutral text-text-disabled",
            )}
          >
            Start paper now
          </button>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Downloads
        </p>
        {sectionDownloads.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sectionDownloads.map(({ paperName, links }) => (
              <li
                key={paperName}
                className="flex flex-wrap items-center gap-2"
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
        ) : (
          <p className="text-sm text-text-muted">
            No PDF downloads for this paper yet.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Or start one part
        </p>
        <ul className="overflow-hidden rounded-lg bg-background/40">
          {displayGroups.map((group, idx) => {
            const done = isDisplayGroupCompleted(
              group,
              partCompletion,
              getPartKey,
            );
            const links = getRoadmapPartSectionDownloads(
              stage,
              group.internalParts[0]!,
            );
            const busy = markingKey === group.key || statusBusy;

            return (
              <li
                key={group.key}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 px-3 py-2.5",
                  idx > 0 && "border-t border-border-subtle/70",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm text-text">
                    {displayLabelForGroup(group)}
                    <span className="ml-2 text-text-muted">
                      {group.paperName}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {links?.paperUrl ? (
                      <DownloadAnchor href={links.paperUrl} label="PDF" />
                    ) : null}
                    {links?.answersUrl ? (
                      <DownloadAnchor
                        href={links.answersUrl}
                        label={links.answersLabel}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <select
                    value={done ? "done" : "not_started"}
                    disabled={!userId || busy}
                    onChange={(e) => {
                      void setGroupDone(
                        group,
                        e.target.value === "done",
                      );
                    }}
                    aria-label={`Status for ${displayLabelForGroup(group)}`}
                    className="rounded-md border-0 bg-surface-mid px-2 py-1 text-xs font-medium text-text outline-none ring-1 ring-border-subtle focus:ring-primary disabled:opacity-50"
                  >
                    <option value="not_started">Not done</option>
                    <option value="done">Done</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => startGroup(group)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Start part
                  </button>
                </div>
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
  userId,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onStartSession,
  onCompletionChange,
}: Props) {
  const [expanded, setExpanded] = useState<{
    id: string;
    mode: ExpandMode;
  } | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

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

  const toggleExpand = (stageId: string, mode: ExpandMode) => {
    setExpanded((prev) =>
      prev?.id === stageId && prev.mode === mode
        ? null
        : { id: stageId, mode },
    );
  };

  const handleStageStatusChange = async (
    stage: RoadmapStage,
    next: ManualRoadmapStatus,
  ) => {
    if (!userId || statusBusyId) return;
    setStatusBusyId(stage.id);
    try {
      await setRoadmapStageManualStatus(userId, stage, next);
      await onCompletionChange();
    } finally {
      setStatusBusyId(null);
    }
  };

  const statusValue = (
    completed: number,
    total: number,
  ): ManualRoadmapStatus | "in_progress" => {
    if (total > 0 && completed === total) return "done";
    if (completed > 0) return "in_progress";
    return "not_started";
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
                {totals.completed} of {totals.total} parts done. Click a paper
                name for options.
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

      <div className="overflow-hidden rounded-xl bg-surface-elevated shadow-sm ring-1 ring-border-subtle/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-mid/70 text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold sm:px-5">Paper</th>
                <th className="w-[5rem] px-3 py-3 font-semibold">Parts</th>
                <th className="w-[7.5rem] px-3 py-3 font-semibold">Status</th>
                <th className="w-[5rem] px-3 py-3 font-semibold">Score</th>
                <th className="w-[7rem] px-4 py-3 text-right font-semibold sm:px-5">
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
                const isOpen = expanded?.id === stage.id;
                const mode = expanded?.mode ?? "options";
                const accentExam = isEsatCampMockRoadmapStage(stage)
                  ? "ESATCamp Mock"
                  : stage.examName;
                const score = stageScores.get(stage.id);
                const commentary = commentaryForStage(stage, stages);
                const zebra = index % 2 === 1;
                const currentStatus = statusValue(completed, total);
                const busy = statusBusyId === stage.id;

                return (
                  <Fragment key={stage.id}>
                    <tr
                      data-stage-id={stage.id}
                      className={cn(
                        "transition-colors",
                        zebra ? "bg-background/25" : "bg-transparent",
                        isOpen && "bg-surface-mid/35",
                        !isOpen && "hover:bg-surface-mid/25",
                      )}
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex min-w-0 items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(stage.id, "options")}
                            aria-expanded={isOpen && mode === "options"}
                            className="min-w-0 text-left"
                          >
                            <span
                              className={cn(
                                "text-base font-semibold leading-snug underline-offset-2 hover:underline",
                                getExamAccentTextClass(accentExam),
                              )}
                            >
                              {stageTitle(stage)}
                            </span>
                          </button>
                          {commentary ? (
                            <RoadmapInfoPopover
                              title={commentary.title}
                              label={`About ${commentary.title}`}
                              align="left"
                              className="mt-0.5"
                            >
                              <p>{commentary.text}</p>
                            </RoadmapInfoPopover>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-text">
                        {completed}/{total}
                      </td>
                      <td className="px-3 py-3.5 text-text">
                        <select
                          value={
                            currentStatus === "in_progress"
                              ? "in_progress"
                              : currentStatus
                          }
                          disabled={!userId || busy}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "in_progress") return;
                            void handleStageStatusChange(
                              stage,
                              value as ManualRoadmapStatus,
                            );
                          }}
                          aria-label={`Status for ${stageTitle(stage)}`}
                          className={cn(
                            "max-w-full rounded-md border-0 bg-surface-mid px-2 py-1.5 text-sm font-medium outline-none ring-1 ring-border-subtle focus:ring-primary disabled:opacity-50",
                            isDone ? "text-text" : "text-text-muted",
                          )}
                          title={
                            userId
                              ? "Manually mark this paper done or not started"
                              : "Sign in to update status"
                          }
                        >
                          <option value="not_started">Not started</option>
                          {currentStatus === "in_progress" ? (
                            <option value="in_progress">In progress</option>
                          ) : null}
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-text">
                        {scoresLoading ? (
                          <span className="inline-block h-3.5 w-8 animate-pulse rounded bg-surface-mid" />
                        ) : (
                          formatRoadmapScore(score)
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(stage.id, "downloads")}
                          aria-expanded={isOpen && mode === "downloads"}
                          aria-label={`Download options for ${stageTitle(stage)}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
                            isOpen &&
                              mode === "downloads" &&
                              "bg-surface-mid text-text",
                          )}
                        >
                          Download
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-fast ease-signature",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-surface-mid/20">
                        <td colSpan={5} className="p-0">
                          <div className="border-t border-border-subtle/80">
                            <StageOptionsPanel
                              stage={stage}
                              partCompletion={data?.parts ?? new Map()}
                              newQuestionsOnly={newQuestionsOnly}
                              mode={mode}
                              userId={userId}
                              statusBusy={busy}
                              onStartSession={onStartSession}
                              onCompletionChange={onCompletionChange}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {stages.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-muted">
            No papers match your subjects yet. Set ESAT modules in your profile.
          </p>
        ) : null}
      </div>
    </div>
  );
}
