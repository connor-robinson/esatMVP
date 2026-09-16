/**
 * Past-papers practice table with NSAA / ENGAA / TMUA pills.
 */

"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { ChevronDown, Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import { isEsatCampMockRoadmapStage } from "@/lib/papers/roadmapConfig";
import { getRoadmapPartKey } from "@/lib/papers/roadmapPartKey";
import {
  displayLabelForGroup,
  expandDisplayGroupsToParts,
  groupRoadmapPartsForDisplay,
  isDisplayGroupCompleted,
  type RoadmapDisplayGroup,
} from "@/lib/papers/roadmapDisplayGroups";
import {
  downloadAllUrls,
  getRoadmapPartSectionDownloads,
  getRoadmapStageAllAnswersUrls,
  getRoadmapStageAllPaperUrls,
} from "@/lib/papers/roadmapDownloads";
import {
  averageScoreForStage,
  formatNumericScore,
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
import { RoadmapStartSessionModal } from "./RoadmapStartSessionModal";

type StageCompletionEntry = {
  completed: number;
  total: number;
  parts: Map<string, boolean>;
};

type ExamTab = "NSAA" | "ENGAA" | "TMUA" | "Mocks";

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

const TAB_ORDER: ExamTab[] = ["NSAA", "ENGAA", "TMUA", "Mocks"];

const TAB_LABELS: Record<ExamTab, string> = {
  NSAA: "NSAA",
  ENGAA: "ENGAA",
  TMUA: "TMUA",
  Mocks: "Mocks",
};

function stageTab(stage: RoadmapStage): ExamTab {
  if (isEsatCampMockRoadmapStage(stage)) return "Mocks";
  if (stage.examName === "ENGAA") return "ENGAA";
  if (stage.examName === "TMUA") return "TMUA";
  return "NSAA";
}

function stageYearLabel(stage: RoadmapStage): string {
  if (isEsatCampMockRoadmapStage(stage)) {
    return stage.label || "Mock";
  }
  if (stage.id === "specimen-papers") return "Specimen";
  return String(stage.year);
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

function CompactBtn({
  children,
  onClick,
  disabled,
  tone = "slate",
  className,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "slate" | "blue" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "slate" &&
          "bg-[#334155] text-[#F8FAFC] hover:bg-[#475569]",
        tone === "blue" &&
          "bg-[#3B82F6]/85 text-white hover:bg-[#3B82F6]",
        tone === "ghost" &&
          "bg-transparent text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F1F5F9]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function UniqueQuestionsSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#94A3B8] sm:text-sm">
        Unique questions only
      </span>
      <RoadmapInfoPopover
        title="Unique questions only"
        panelClassName="bg-[#1B2438]"
      >
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
          enabled ? "bg-[#3B82F6]/80" : "bg-[#334155]",
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

function SectionsExpandPanel({
  stage,
  partCompletion,
  newQuestionsOnly,
  userId,
  statusBusy,
  onStartSession,
  onCompletionChange,
}: {
  stage: RoadmapStage;
  partCompletion: Map<string, boolean>;
  newQuestionsOnly: boolean;
  userId: string | null;
  statusBusy: boolean;
  onStartSession: Props["onStartSession"];
  onCompletionChange: Props["onCompletionChange"];
}) {
  const getPartKey = getRoadmapPartKey;
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const displayGroups = useMemo(
    () => groupRoadmapPartsForDisplay(stage.parts),
    [stage.parts],
  );

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
    <div className="space-y-3 border-t border-white/[0.06] bg-[#121826] px-3 py-3.5 sm:px-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        Sections
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
                idx > 0 && "border-t border-white/[0.06]",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-[#F1F5F9]">
                  {displayLabelForGroup(group)}
                  <span className="ml-2 text-[#94A3B8]">{group.paperName}</span>
                </p>
                {(links?.paperUrl || links?.answersUrl) && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {links.paperUrl ? (
                      <a
                        href={links.paperUrl}
                        download
                        className="text-xs font-medium text-[#94A3B8] underline-offset-2 hover:text-[#F1F5F9] hover:underline"
                      >
                        Paper
                      </a>
                    ) : null}
                    {links.answersUrl ? (
                      <a
                        href={links.answersUrl}
                        download
                        className="text-xs font-medium text-[#94A3B8] underline-offset-2 hover:text-[#F1F5F9] hover:underline"
                      >
                        Answers
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <select
                  value={done ? "done" : "not_started"}
                  disabled={!userId || busy}
                  onChange={(e) => {
                    void setGroupDone(group, e.target.value === "done");
                  }}
                  aria-label={`Status for ${displayLabelForGroup(group)}`}
                  className="rounded-sm border-0 bg-[#1B2438] px-2 py-1 text-xs font-medium text-[#E2E8F0] outline-none ring-1 ring-white/10 disabled:opacity-50"
                >
                  <option value="not_started">Not done</option>
                  <option value="done">Done</option>
                </select>
                <CompactBtn tone="blue" onClick={() => startGroup(group)}>
                  Start
                  <Play className="h-3 w-3 fill-current opacity-80" aria-hidden />
                </CompactBtn>
              </div>
            </li>
          );
        })}
      </ul>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [startStage, setStartStage] = useState<RoadmapStage | null>(null);
  const [averagesByVariant, setAveragesByVariant] = useState<
    Record<string, number>
  >({});
  const [averagesLoading, setAveragesLoading] = useState(true);

  const grouped = useMemo(() => {
    const map: Record<ExamTab, RoadmapStage[]> = {
      NSAA: [],
      ENGAA: [],
      TMUA: [],
      Mocks: [],
    };
    for (const stage of stages) {
      map[stageTab(stage)].push(stage);
    }
    return map;
  }, [stages]);

  const availableTabs = useMemo(
    () => TAB_ORDER.filter((tab) => grouped[tab].length > 0),
    [grouped],
  );

  const [activeTab, setActiveTab] = useState<ExamTab>("NSAA");

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]!);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    let cancelled = false;
    async function loadAverages() {
      setAveragesLoading(true);
      try {
        const res = await fetch("/api/past-papers/roadmap-averages");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as {
          averages?: Record<string, number>;
        };
        if (!cancelled) setAveragesByVariant(data.averages ?? {});
      } catch {
        if (!cancelled) setAveragesByVariant({});
      } finally {
        if (!cancelled) setAveragesLoading(false);
      }
    }
    void loadAverages();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleStages = grouped[activeTab] ?? [];

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

  const statusValue = (
    completed: number,
    total: number,
  ): ManualRoadmapStatus | "in_progress" => {
    if (total > 0 && completed === total) return "done";
    if (completed > 0) return "in_progress";
    return "not_started";
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
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
          Past papers
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {completionLoading ? (
            <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-mid" />
          ) : (
            <>
              {totals.completed} of {totals.total} parts done across all papers.
            </>
          )}
        </p>
      </div>

      {availableTabs.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setExpandedId(null);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-[#334155] text-[#F1F5F9]"
                  : "bg-transparent text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#CBD5E1]",
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-sm bg-[#161D2F]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <h2 className="text-sm font-semibold tracking-tight text-[#F1F5F9]">
            {TAB_LABELS[activeTab]}
          </h2>
          {activeTab === "ENGAA" ? (
            <UniqueQuestionsSwitch
              enabled={newQuestionsOnly}
              onChange={onNewQuestionsOnlyChange}
            />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                <th className="px-3 py-2">Year</th>
                <th className="w-10 px-2 py-2" />
                <th className="px-3 py-2">Parts</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Avg score</th>
                <th className="px-3 py-2">Your score</th>
                <th className="px-3 py-2">Paper</th>
                <th className="px-3 py-2">Answers</th>
                <th className="px-3 py-2">Start</th>
              </tr>
            </thead>
            <tbody>
              {visibleStages.map((stage, index) => {
                const data = completionData.get(stage.id);
                const completed = data?.completed ?? 0;
                const total =
                  data?.total ??
                  groupRoadmapPartsForDisplay(stage.parts).length;
                const isOpen = expandedId === stage.id;
                const yourScore = stageScores.get(stage.id);
                const avgScore = averageScoreForStage(
                  stage,
                  averagesByVariant,
                );
                const commentary = commentaryForStage(stage, stages);
                const currentStatus = statusValue(completed, total);
                const busy = statusBusyId === stage.id;
                const paperUrls = getRoadmapStageAllPaperUrls(stage);
                const answersUrls = getRoadmapStageAllAnswersUrls(stage);

                return (
                  <Fragment key={stage.id}>
                    <tr
                      data-stage-id={stage.id}
                      className={
                        index % 2 === 0
                          ? "bg-white/[0.035]"
                          : "bg-transparent"
                      }
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums font-medium text-[#F1F5F9]">
                            {stageYearLabel(stage)}
                          </span>
                          {commentary ? (
                            <RoadmapInfoPopover
                              title={commentary.title}
                              label={`About ${commentary.title}`}
                              align="left"
                              panelClassName="bg-[#1B2438]"
                            >
                              <p>{commentary.text}</p>
                            </RoadmapInfoPopover>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-2 py-2.5 align-middle">
                        <CompactBtn
                          tone="ghost"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setExpandedId(isOpen ? null : stage.id)
                          }
                          className="!px-1.5"
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                          <span className="sr-only">
                            {isOpen ? "Hide sections" : "Show sections"}
                          </span>
                        </CompactBtn>
                      </td>

                      <td className="px-3 py-2.5 align-middle tabular-nums text-[#CBD5E1]">
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
                            void handleStageStatusChange(
                              stage,
                              value as ManualRoadmapStatus,
                            );
                          }}
                          aria-label={`Status for ${stageYearLabel(stage)}`}
                          className="rounded-sm border-0 bg-[#1B2438] px-2 py-1.5 text-sm font-medium text-[#E2E8F0] outline-none ring-1 ring-white/10 disabled:opacity-50"
                        >
                          <option value="not_started">Not started</option>
                          {currentStatus === "in_progress" ? (
                            <option value="in_progress">In progress</option>
                          ) : null}
                          <option value="done">Done</option>
                        </select>
                      </td>

                      <td className="px-3 py-2.5 align-middle tabular-nums text-[#94A3B8]">
                        {averagesLoading ? (
                          <span className="inline-block h-3.5 w-8 animate-pulse rounded-sm bg-white/10" />
                        ) : avgScore == null ? (
                          <span className="text-xs font-normal">No data</span>
                        ) : (
                          formatNumericScore(avgScore)
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle tabular-nums font-medium text-[#93C5FD]">
                        {scoresLoading ? (
                          <span className="inline-block h-3.5 w-8 animate-pulse rounded-sm bg-white/10" />
                        ) : (
                          formatRoadmapScore(yourScore)
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <CompactBtn
                          tone="slate"
                          disabled={paperUrls.length === 0}
                          onClick={() => downloadAllUrls(paperUrls)}
                        >
                          Paper
                          <Download className="h-3.5 w-3.5 opacity-80" aria-hidden />
                        </CompactBtn>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <CompactBtn
                          tone="slate"
                          disabled={answersUrls.length === 0}
                          onClick={() => downloadAllUrls(answersUrls)}
                        >
                          Answers
                          <Download className="h-3.5 w-3.5 opacity-80" aria-hidden />
                        </CompactBtn>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <CompactBtn
                          tone="blue"
                          onClick={() => setStartStage(stage)}
                        >
                          Start now
                          <Play
                            className="h-3.5 w-3.5 fill-current opacity-80"
                            aria-hidden
                          />
                        </CompactBtn>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <SectionsExpandPanel
                            stage={stage}
                            partCompletion={data?.parts ?? new Map()}
                            newQuestionsOnly={newQuestionsOnly}
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

        {visibleStages.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-[#94A3B8]">
            No papers in this group for your subjects.
          </p>
        ) : null}
      </div>

      {stages.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          No papers match your subjects yet. Set ESAT modules in your profile.
        </p>
      ) : null}

      <RoadmapStartSessionModal
        open={startStage != null}
        stage={startStage}
        partCompletion={
          startStage
            ? (completionData.get(startStage.id)?.parts ?? new Map())
            : new Map()
        }
        newQuestionsOnly={newQuestionsOnly}
        onNewQuestionsOnlyChange={onNewQuestionsOnlyChange}
        onClose={() => setStartStage(null)}
        onStart={onStartSession}
      />
    </div>
  );
}
