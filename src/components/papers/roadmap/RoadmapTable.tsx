/**
 * Past-papers practice list, styled like the esat-past-papers compact tables,
 * grouped by NSAA / ENGAA / TMUA.
 */

"use client";

import { useMemo, useState, Fragment } from "react";
import { ChevronDown, Download, Play } from "lucide-react";
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

type ExamGroupKey = "NSAA" | "ENGAA" | "TMUA" | "Mocks";

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

const GROUP_ORDER: ExamGroupKey[] = ["NSAA", "ENGAA", "TMUA", "Mocks"];

const GROUP_HEADINGS: Record<ExamGroupKey, string> = {
  NSAA: "NSAA",
  ENGAA: "ENGAA",
  TMUA: "TMUA",
  Mocks: "ESAT Camp mocks",
};

function stageGroupKey(stage: RoadmapStage): ExamGroupKey {
  if (isEsatCampMockRoadmapStage(stage)) return "Mocks";
  if (stage.examName === "ENGAA") return "ENGAA";
  if (stage.examName === "TMUA") return "TMUA";
  return "NSAA";
}

function stageTitle(stage: RoadmapStage): string {
  if (isEsatCampMockRoadmapStage(stage)) {
    return stage.label || "ESATCamp Mock";
  }
  if (stage.id === "specimen-papers") return "Specimen";
  return String(stage.year);
}

function stageSubtitle(stage: RoadmapStage): string | null {
  if (isEsatCampMockRoadmapStage(stage)) return null;
  if (stage.id === "specimen-papers") return stage.examName;
  return null;
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

function describeDefaultSections(defaultParts: RoadmapPart[]): string[] {
  const groups = groupRoadmapPartsForDisplay(defaultParts);
  if (groups.length === 0) return [];
  return groups.map((group) => {
    const label = displayLabelForGroup(group);
    return group.paperName ? `${label} (${group.paperName})` : label;
  });
}

function CompactDownloadLink({
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
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-border-subtle bg-surface-mid px-2.5 py-1.5 text-sm font-medium leading-none text-text transition-colors hover:bg-surface-neutral"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
      <Download aria-hidden className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

function UniqueQuestionsSwitch({
  enabled,
  onChange,
  className,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-text-muted sm:text-sm">
        Unique questions only
      </span>
      <RoadmapInfoPopover title="Unique questions only">
        <p>
          When on, ENGAA sessions skip questions you already did in NSAA (and
          other overlaps).
        </p>
      </RoadmapInfoPopover>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Unique questions only"
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-sm transition-colors",
          enabled ? "bg-primary/70" : "bg-surface-neutral",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-sm bg-white transition-transform",
            enabled ? "left-[16px]" : "left-0.5",
          )}
        />
      </button>
    </div>
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
    () => describeDefaultSections(defaultParts),
    [defaultParts],
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
    <div className="space-y-4 border-t border-border-subtle bg-surface-mid/40 px-3 py-3.5 sm:px-3.5">
      {mode === "options" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">Start paper now</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              {sectionSummary.length > 0 ? (
                <>
                  Includes:{" "}
                  <span className="text-text">{sectionSummary.join(" · ")}</span>
                </>
              ) : (
                "No incomplete sections left. Start an individual part below."
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={defaultParts.length === 0}
            onClick={startDefaults}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors",
              defaultParts.length > 0
                ? "border-border bg-surface-elevated text-text hover:bg-surface-neutral"
                : "cursor-not-allowed border-border-subtle text-text-disabled",
            )}
          >
            Start paper now
            <Play className="h-3.5 w-3.5 fill-current opacity-70" aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          Downloads
        </p>
        {sectionDownloads.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sectionDownloads.map(({ paperName, links }) => (
              <li
                key={paperName}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="min-w-[5rem] text-sm text-text-muted">
                  {paperName}
                </span>
                {links.paperUrl ? (
                  <CompactDownloadLink href={links.paperUrl} label="Paper" />
                ) : null}
                {links.answersUrl ? (
                  <CompactDownloadLink
                    href={links.answersUrl}
                    label={links.answersLabel}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No PDFs for this paper yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          Or start one part
        </p>
        <ul>
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
                  "flex flex-wrap items-center justify-between gap-3 py-2.5",
                  idx > 0 && "border-t border-border-subtle",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm text-text">
                    {displayLabelForGroup(group)}
                    <span className="ml-2 text-text-muted">{group.paperName}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {links?.paperUrl ? (
                      <CompactDownloadLink href={links.paperUrl} label="PDF" />
                    ) : null}
                    {links?.answersUrl ? (
                      <CompactDownloadLink
                        href={links.answersUrl}
                        label={links.answersLabel}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <select
                    value={done ? "done" : "not_started"}
                    disabled={!userId || busy}
                    onChange={(e) => {
                      void setGroupDone(group, e.target.value === "done");
                    }}
                    aria-label={`Status for ${displayLabelForGroup(group)}`}
                    className="rounded-sm border-0 bg-surface-elevated px-2 py-1 text-xs font-medium text-text outline-none ring-1 ring-border-subtle disabled:opacity-50"
                  >
                    <option value="not_started">Not done</option>
                    <option value="done">Done</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => startGroup(group)}
                    className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-neutral"
                  >
                    Start
                    <Play className="h-3 w-3 fill-current opacity-70" aria-hidden />
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

function ExamGroupTable({
  heading,
  stages,
  allStages,
  completionData,
  stageScores,
  scoresLoading,
  userId,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  showUniqueQuestions,
  expanded,
  statusBusyId,
  onToggleExpand,
  onStartSession,
  onCompletionChange,
  onStageStatusChange,
}: {
  heading: string;
  stages: RoadmapStage[];
  allStages: RoadmapStage[];
  completionData: Map<string, StageCompletionEntry>;
  stageScores: Map<string, RoadmapStageScore>;
  scoresLoading: boolean;
  userId: string | null;
  newQuestionsOnly: boolean;
  onNewQuestionsOnlyChange?: (enabled: boolean) => void;
  showUniqueQuestions?: boolean;
  expanded: { id: string; mode: ExpandMode } | null;
  statusBusyId: string | null;
  onToggleExpand: (stageId: string, mode: ExpandMode) => void;
  onStartSession: Props["onStartSession"];
  onCompletionChange: Props["onCompletionChange"];
  onStageStatusChange: (
    stage: RoadmapStage,
    next: ManualRoadmapStatus,
  ) => void;
}) {
  if (stages.length === 0) return null;

  const statusValue = (
    completed: number,
    total: number,
  ): ManualRoadmapStatus | "in_progress" => {
    if (total > 0 && completed === total) return "done";
    if (completed > 0) return "in_progress";
    return "not_started";
  };

  return (
    <div className="overflow-hidden rounded-sm border border-border-subtle bg-surface-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-3 py-2.5">
        <h2 className="text-sm font-semibold tracking-tight text-text">
          {heading}
        </h2>
        {showUniqueQuestions && onNewQuestionsOnlyChange ? (
          <UniqueQuestionsSwitch
            enabled={newQuestionsOnly}
            onChange={onNewQuestionsOnlyChange}
          />
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-3 py-2">Paper</th>
              <th className="px-3 py-2">Parts</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Practice</th>
              <th className="px-3 py-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => {
              const data = completionData.get(stage.id);
              const completed = data?.completed ?? 0;
              const total =
                data?.total ??
                groupRoadmapPartsForDisplay(stage.parts).length;
              const isOpen = expanded?.id === stage.id;
              const mode = expanded?.mode ?? "options";
              const score = stageScores.get(stage.id);
              const commentary = commentaryForStage(stage, allStages);
              const currentStatus = statusValue(completed, total);
              const busy = statusBusyId === stage.id;
              const subtitle = stageSubtitle(stage);

              return (
                <Fragment key={stage.id}>
                  <tr
                    data-stage-id={stage.id}
                    className={
                      index % 2 === 0
                        ? "bg-surface-mid/30"
                        : "bg-transparent"
                    }
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(stage.id, "options")}
                          aria-expanded={isOpen && mode === "options"}
                          className="text-left text-sm font-medium tabular-nums text-text transition-colors hover:text-text-muted"
                        >
                          {stageTitle(stage)}
                          {subtitle ? (
                            <span className="ml-1.5 text-sm font-normal text-text-muted">
                              {subtitle}
                            </span>
                          ) : null}
                        </button>
                        {commentary ? (
                          <RoadmapInfoPopover
                            title={commentary.title}
                            label={`About ${commentary.title}`}
                            align="left"
                          >
                            <p>{commentary.text}</p>
                          </RoadmapInfoPopover>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle tabular-nums text-text-muted">
                      {completed}/{total}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
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
                          onStageStatusChange(
                            stage,
                            value as ManualRoadmapStatus,
                          );
                        }}
                        aria-label={`Status for ${stageTitle(stage)}`}
                        className="rounded-sm border-0 bg-background px-2 py-1.5 text-sm font-medium text-text outline-none ring-1 ring-border-subtle disabled:opacity-50"
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
                    <td className="px-3 py-2.5 align-middle tabular-nums text-text">
                      {scoresLoading ? (
                        <span className="inline-block h-3.5 w-8 animate-pulse rounded-sm bg-surface-mid" />
                      ) : (
                        formatRoadmapScore(score)
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <button
                        type="button"
                        onClick={() => onToggleExpand(stage.id, "options")}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-border-subtle bg-background px-2.5 py-1.5 text-sm font-medium leading-none text-text transition-colors hover:bg-surface-mid"
                      >
                        Start now
                        <Play
                          aria-hidden
                          className="h-3.5 w-3.5 fill-current opacity-70"
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <button
                        type="button"
                        onClick={() => onToggleExpand(stage.id, "downloads")}
                        aria-expanded={isOpen && mode === "downloads"}
                        className={cn(
                          "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border border-border-subtle bg-background px-2.5 py-1.5 text-sm font-medium leading-none text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
                          isOpen &&
                            mode === "downloads" &&
                            "bg-surface-mid text-text",
                        )}
                      >
                        Download
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 opacity-80 transition-transform",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={6} className="p-0">
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
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
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

  const grouped = useMemo(() => {
    const map: Record<ExamGroupKey, RoadmapStage[]> = {
      NSAA: [],
      ENGAA: [],
      TMUA: [],
      Mocks: [],
    };
    for (const stage of stages) {
      map[stageGroupKey(stage)].push(stage);
    }
    return map;
  }, [stages]);

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

  return (
    <div className="font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
          Past papers
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {completionLoading ? (
            <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-mid" />
          ) : (
            <>
              {totals.completed} of {totals.total} parts done. Open a paper for
              options, or mark status yourself.
            </>
          )}
        </p>
      </div>

      <div className="space-y-5">
        {GROUP_ORDER.map((key) => {
          const groupStages = grouped[key];
          if (groupStages.length === 0) return null;

          return (
            <section key={key}>
              <ExamGroupTable
                heading={GROUP_HEADINGS[key]}
                stages={groupStages}
                allStages={stages}
                completionData={completionData}
                stageScores={stageScores}
                scoresLoading={scoresLoading}
                userId={userId}
                newQuestionsOnly={newQuestionsOnly}
                onNewQuestionsOnlyChange={onNewQuestionsOnlyChange}
                showUniqueQuestions={key === "ENGAA"}
                expanded={expanded}
                statusBusyId={statusBusyId}
                onToggleExpand={toggleExpand}
                onStartSession={onStartSession}
                onCompletionChange={onCompletionChange}
                onStageStatusChange={(stage, next) => {
                  void handleStageStatusChange(stage, next);
                }}
              />
            </section>
          );
        })}
      </div>

      {stages.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          No papers match your subjects yet. Set ESAT modules in your profile.
        </p>
      ) : null}
    </div>
  );
}
