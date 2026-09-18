/**
 * Past-papers practice list with NSAA / ENGAA / TMUA / ESAT CAMP Mocks pills.
 * Separated row cards (not a table).
 */

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExamAccentFillClass } from "@/config/colors";
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
  type RoadmapAverageMaps,
  type RoadmapStageScore,
} from "@/lib/papers/roadmapStageScores";
import { RoadmapInfoPopover } from "./RoadmapInfoPopover";
import {
  getStageCommentary,
  type StageCommentary,
} from "./roadmapTimelineMarkers";
import type { RoadmapStartOptions } from "./StageListCard";
import { RoadmapStartSessionModal } from "./RoadmapStartSessionModal";
import { CompareInviteModal } from "@/components/mockCompare/CompareInviteModal";

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
  subjectSuggestion?: {
    subjects: string[];
    showingAll: boolean;
    onToggleShowAll: () => void;
  } | null;
  preferredEsatSubjects?: string[] | null;
  layoutControls?: ReactNode;
  showFreePill?: boolean;
};

const TAB_ORDER: ExamTab[] = ["Mocks", "NSAA", "ENGAA", "TMUA"];

const TAB_LABELS: Record<ExamTab, string> = {
  NSAA: "NSAA",
  ENGAA: "ENGAA",
  TMUA: "TMUA",
  Mocks: "ESAT CAMP Mocks",
};

const STAGE_GRID =
  "grid min-w-[52rem] grid-cols-[7rem_5.5rem_8rem_5rem_7rem_minmax(16rem,1fr)] items-center gap-x-3";

const ACTION_BTN = "rounded px-3.5 py-2 text-[15px]";
const CHEVRON_SPACER = "inline-flex h-9 w-9 shrink-0";

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
  examName,
  className,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "slate" | "blue" | "ghost" | "exam";
  examName?: string;
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
          "bg-surface-neutral text-text hover:bg-surface-mid",
        tone === "blue" &&
          "bg-primary text-white hover:bg-primary-hover",
        tone === "ghost" &&
          "bg-transparent text-text-muted hover:bg-surface-mid hover:text-text",
        tone === "exam" &&
          cn(getExamAccentFillClass(examName ?? "NSAA"), "!text-white hover:opacity-90"),
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
          enabled ? "bg-primary" : "bg-surface-neutral",
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

type StageStatus = "not_started" | "in_progress" | "done";

function statusFromCounts(completed: number, total: number): StageStatus {
  if (total > 0 && completed === total) return "done";
  if (completed > 0) return "in_progress";
  return "not_started";
}

const STATUS_LABEL: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

function StatusChip({
  status,
  size = "md",
}: {
  status: StageStatus;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        status === "done" && "bg-primary/12 text-primary",
        status === "in_progress" && "bg-surface-neutral text-text",
        status === "not_started" && "bg-surface-mid/60 text-text-muted",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SectionsExpandRows({
  stage,
  partCompletion,
  newQuestionsOnly,
  onStartSession,
}: {
  stage: RoadmapStage;
  partCompletion: Map<string, boolean>;
  newQuestionsOnly: boolean;
  onStartSession: Props["onStartSession"];
}) {
  const getPartKey = getRoadmapPartKey;
  const displayGroups = useMemo(
    () => groupRoadmapPartsForDisplay(stage.parts),
    [stage.parts],
  );
  const isMock = isEsatCampMockRoadmapStage(stage);

  const startGroup = (group: RoadmapDisplayGroup) => {
    onStartSession(
      stage,
      expandDisplayGroupsToParts(stage.parts, new Set([group.key])),
      {
        newQuestionsOnly:
          stage.examName === "ENGAA" ? newQuestionsOnly : false,
      },
    );
  };

  return (
    <div className="relative space-y-1 pt-3">
      <div
        aria-hidden
        className="absolute bottom-2 left-[0.85rem] top-3 w-px bg-border-subtle"
      />
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
        const isLast = idx === displayGroups.length - 1;

        return (
          <div key={group.key} className={cn(STAGE_GRID, "relative py-2")}>
            <div className="col-span-2 flex min-w-0 items-center gap-2.5 pl-0.5">
              <span className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center bg-surface-elevated">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isLast ? "bg-text-subtle" : "bg-text-muted",
                  )}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {displayLabelForGroup(group)}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {isMock ? "40 min · 27 questions" : group.paperName}
                </p>
              </div>
            </div>

            <div>
              <StatusChip
                status={done ? "done" : "not_started"}
                size="sm"
              />
            </div>
            <div aria-hidden />
            <div aria-hidden />

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <CompactBtn
                tone="slate"
                disabled={!links?.paperUrl}
                onClick={() => {
                  if (links?.paperUrl) downloadAllUrls([links.paperUrl]);
                }}
                className={ACTION_BTN}
              >
                Paper
                <Download className="h-4 w-4 opacity-80" aria-hidden />
              </CompactBtn>
              <CompactBtn
                tone="slate"
                disabled={!links?.answersUrl}
                onClick={() => {
                  if (links?.answersUrl) downloadAllUrls([links.answersUrl]);
                }}
                className={ACTION_BTN}
              >
                Answers
                <Download className="h-4 w-4 opacity-80" aria-hidden />
              </CompactBtn>
              <CompactBtn
                tone="exam"
                examName={stage.examName}
                onClick={() => startGroup(group)}
                className={ACTION_BTN}
              >
                Start now
                <Play className="h-4 w-4 fill-current opacity-80" aria-hidden />
              </CompactBtn>
              <span className={CHEVRON_SPACER} aria-hidden />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RoadmapTable({
  stages,
  completionData,
  stageScores,
  scoresLoading = false,
  userId: _userId,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onStartSession,
  onCompletionChange: _onCompletionChange,
  subjectSuggestion = null,
  preferredEsatSubjects = null,
  layoutControls = null,
  showFreePill = false,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startStage, setStartStage] = useState<RoadmapStage | null>(null);
  const [compareInvite, setCompareInvite] = useState<{
    stage: RoadmapStage;
    selectedParts: RoadmapPart[];
    options: RoadmapStartOptions;
  } | null>(null);
  const [averageMaps, setAverageMaps] = useState<RoadmapAverageMaps>({
    averages: {},
  });
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
        const data = (await res.json()) as RoadmapAverageMaps;
        if (!cancelled) {
          setAverageMaps({
            averages: data.averages ?? {},
            counts: data.counts,
            yearAverages: data.yearAverages,
            yearCounts: data.yearCounts,
          });
        }
      } catch {
        if (!cancelled) setAverageMaps({ averages: {} });
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

  const statusValue = (completed: number, total: number): StageStatus =>
    statusFromCounts(completed, total);

  return (
    <div className="font-sans">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="relative inline-block pr-8">
                <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                  Past papers
                </h1>
                {showFreePill ? (
                  <span className="absolute -right-0 -top-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted dark:bg-white/90 dark:text-neutral-700">
                    Free
                  </span>
                ) : null}
              </div>
              {subjectSuggestion ? (
                <RoadmapInfoPopover
                  title="Paper suggestions"
                  label="Subject suggestions"
                  align="left"
                >
                  <p className="text-sm text-text-muted">
                    {subjectSuggestion.showingAll ? (
                      <>Showing all past papers.</>
                    ) : subjectSuggestion.subjects.length > 0 ? (
                      <>
                        Suggested based on your indicated ESAT subjects:{" "}
                        <span className="font-medium text-text">
                          {subjectSuggestion.subjects.join(", ")}
                        </span>
                        .
                      </>
                    ) : (
                      <>Suggested based on your exam preference.</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={subjectSuggestion.onToggleShowAll}
                    className="mt-3 rounded-sm px-2.5 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    {subjectSuggestion.showingAll
                      ? "Show suggested"
                      : "Show all"}
                  </button>
                </RoadmapInfoPopover>
              ) : null}
            </div>
          </div>
          {layoutControls ? (
            <div className="ml-auto w-full sm:w-auto">{layoutControls}</div>
          ) : null}
        </div>
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
                "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-surface-neutral text-text"
                  : "bg-transparent text-text-muted hover:bg-surface-mid hover:text-text",
              )}
            >
              {TAB_LABELS[tab]}
              {tab === "Mocks" ? (
                <span className="absolute -right-1 -top-1.5 rounded-full bg-error px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                  New
                </span>
              ) : null}
            </button>
          ))}
          {activeTab === "ENGAA" ? (
            <div className="ml-auto">
              <UniqueQuestionsSwitch
                enabled={newQuestionsOnly}
                onChange={onNewQuestionsOnlyChange}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="overflow-x-auto">
          <div
            className={cn(
              STAGE_GRID,
              "mb-2 px-5 text-xs font-medium uppercase tracking-wide text-text-muted",
            )}
          >
            <div>Year</div>
            <div>Parts</div>
            <div>Status</div>
            <div>Avg</div>
            <div>
              {activeTab === "TMUA" ? "Your TMUA" : "Your ESAT"}
            </div>
            <div className="sr-only">Actions</div>
          </div>

          <div className="space-y-3" role="list">
            {visibleStages.map((stage) => {
              const data = completionData.get(stage.id);
              const completed = data?.completed ?? 0;
              const total =
                data?.total ??
                groupRoadmapPartsForDisplay(stage.parts).length;
              const isOpen = expandedId === stage.id;
              const yourScore = stageScores.get(stage.id);
              const avgScore = averageScoreForStage(stage, averageMaps);
              const commentary = commentaryForStage(stage, stages);
              const currentStatus = statusValue(completed, total);
              const paperUrls = getRoadmapStageAllPaperUrls(stage);
              const answersUrls = getRoadmapStageAllAnswersUrls(stage);

              return (
                <div
                  key={stage.id}
                  data-stage-id={stage.id}
                  role="listitem"
                  className="rounded bg-surface-elevated px-5 py-5"
                >
                  <div className={STAGE_GRID}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-semibold tabular-nums tracking-tight text-text sm:text-lg">
                        {stageYearLabel(stage)}
                      </span>
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

                    <div className="text-sm tabular-nums text-text-muted">
                      {completed}/{total}
                    </div>

                    <div>
                      <StatusChip status={currentStatus} />
                    </div>

                    <div className="text-sm tabular-nums text-text-muted">
                      {averagesLoading ? (
                        <span className="inline-block h-3.5 w-8 animate-pulse rounded-sm bg-surface-mid" />
                      ) : (
                        formatNumericScore(avgScore)
                      )}
                    </div>

                    <div className="text-sm tabular-nums font-medium text-primary">
                      {scoresLoading ? (
                        <span className="inline-block h-3.5 w-8 animate-pulse rounded-sm bg-surface-mid" />
                      ) : (
                        formatRoadmapScore(yourScore)
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                      <CompactBtn
                        tone="slate"
                        disabled={paperUrls.length === 0}
                        onClick={() => downloadAllUrls(paperUrls)}
                        className={ACTION_BTN}
                      >
                        Paper
                        <Download className="h-4 w-4 opacity-80" aria-hidden />
                      </CompactBtn>
                      <CompactBtn
                        tone="slate"
                        disabled={answersUrls.length === 0}
                        onClick={() => downloadAllUrls(answersUrls)}
                        className={ACTION_BTN}
                      >
                        Answers
                        <Download className="h-4 w-4 opacity-80" aria-hidden />
                      </CompactBtn>
                      <CompactBtn
                        tone="exam"
                        examName={stage.examName}
                        onClick={() => setStartStage(stage)}
                        className={ACTION_BTN}
                      >
                        Start now
                        <Play
                          className="h-4 w-4 fill-current opacity-80"
                          aria-hidden
                        />
                      </CompactBtn>
                      <CompactBtn
                        tone="ghost"
                        aria-expanded={isOpen}
                        aria-label={
                          isOpen ? "Hide sections" : "Show sections"
                        }
                        onClick={() =>
                          setExpandedId(isOpen ? null : stage.id)
                        }
                        className="!px-2"
                      >
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 transition-transform duration-300 ease-out",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </CompactBtn>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <SectionsExpandRows
                        stage={stage}
                        partCompletion={data?.parts ?? new Map()}
                        newQuestionsOnly={newQuestionsOnly}
                        onStartSession={onStartSession}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {visibleStages.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">
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
        preferredEsatSubjects={preferredEsatSubjects}
        onClose={() => setStartStage(null)}
        onStart={onStartSession}
        onCompareWithFriend={(stage, selectedParts, options) => {
          setCompareInvite({ stage, selectedParts, options });
        }}
      />

      {compareInvite ? (
        <CompareInviteModal
          open
          stage={compareInvite.stage}
          selectedParts={compareInvite.selectedParts}
          options={compareInvite.options}
          onClose={() => setCompareInvite(null)}
          onStartSitting={onStartSession}
        />
      ) : null}
    </div>
  );
}
