"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESAT_MOCK_MODULES,
  findMockModule,
  mockSlotsForModule,
  type EsatMockAttemptSummary,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";
import { RoadmapInfoPopover } from "@/components/papers/roadmap/RoadmapInfoPopover";

type EsatMockModuleSelectorProps = {
  /** Optional completion rows keyed by module id (logged-in only). */
  attemptsByModule?: Partial<
    Record<EsatMockModuleId, readonly EsatMockAttemptSummary[]>
  >;
  className?: string;
};

type TabId = EsatMockModuleId | "full";

/** Mirrors past-papers RoadmapTable stage grid (without Parts / Avg / Your ESAT / Status). */
const MOCK_ROW_GRID =
  "grid min-w-[46rem] grid-cols-[14rem_7.5rem_minmax(16rem,1fr)] items-center gap-x-3";

const ACTION_BTN =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3.5 py-2 text-[15px] font-medium leading-none transition-colors";

const QUIET_BTN = cn(
  ACTION_BTN,
  "bg-white/[0.08] text-[#F8FAFC] hover:bg-white/[0.12]",
);

function DifficultyStars({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${clamped} out of 5 stars`}
      title={`${clamped} / 5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < clamped;
        return (
          <Star
            key={index}
            aria-hidden
            className={cn(
              "h-4 w-4",
              filled
                ? "fill-[#94A3B8] text-[#94A3B8]"
                : "fill-transparent text-[#334155]",
            )}
          />
        );
      })}
    </div>
  );
}

function pillClass(selected: boolean) {
  return cn(
    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
    selected
      ? "bg-white/[0.12] text-white"
      : "bg-transparent text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#CBD5E1]",
  );
}

export function EsatMockModuleSelector({
  attemptsByModule: _attemptsByModule,
  className,
}: EsatMockModuleSelectorProps) {
  const [selectedId, setSelectedId] = useState<TabId>("maths-1");
  const isFullTab = selectedId === "full";
  const selectedModule = isFullTab
    ? findMockModule("maths-1")
    : findMockModule(selectedId);
  const slots = useMemo(
    () => mockSlotsForModule(selectedModule),
    [selectedModule],
  );

  return (
    <div className={cn("space-y-6 font-sans", className)}>
      <div
        role="tablist"
        aria-label="ESAT modules"
        className="flex flex-wrap items-center gap-2"
      >
        {ESAT_MOCK_MODULES.map((module) => {
          const isSelected = module.id === selectedId;
          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              id={`mock-tab-${module.id}`}
              aria-controls="mock-panel"
              onClick={() => setSelectedId(module.id)}
              className={pillClass(isSelected)}
            >
              {module.label}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={isFullTab}
          id="mock-tab-full"
          aria-controls="mock-panel"
          onClick={() => setSelectedId("full")}
          className={pillClass(isFullTab)}
        >
          Full
        </button>
      </div>

      <div
        id="mock-panel"
        role="tabpanel"
        aria-labelledby={
          isFullTab ? "mock-tab-full" : `mock-tab-${selectedModule.id}`
        }
      >
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          {isFullTab
            ? "ESAT CAMP Full papers"
            : `ESAT CAMP ${selectedModule.builderSubject}`}
        </h2>

        <div className="overflow-x-auto">
          <div
            className={cn(
              MOCK_ROW_GRID,
              "mb-2 px-5 text-xs font-medium uppercase tracking-wide text-[#94A3B8]",
            )}
          >
            <div>Mock</div>
            <div className="flex items-center gap-1">
              <span>Difficulty</span>
              <RoadmapInfoPopover
                title="Difficulty scale"
                label="About difficulty stars"
                align="left"
                className="text-[#94A3B8] [&_button]:text-[#94A3B8] [&_button:hover]:bg-white/[0.08] [&_button:hover]:text-[#E2E8F0]"
                panelClassName="bg-[#1E293B] text-[#E2E8F0] shadow-lg [&_p]:text-[#94A3B8] [&_button]:text-[#94A3B8] [&_button:hover]:bg-white/[0.08] [&_button:hover]:text-[#E2E8F0]"
              >
                <p>A typical NSAA paper is about 2 stars on this scale.</p>
              </RoadmapInfoPopover>
            </div>
            <div className="sr-only">Actions</div>
          </div>

          <ul className="space-y-3" role="list">
            {isFullTab
              ? ESAT_MOCK_MODULES.map((module) => {
                  const moduleSlots = mockSlotsForModule(module);
                  const firstSlot = moduleSlots[0];
                  return (
                    <li
                      key={module.id}
                      role="listitem"
                      className="rounded bg-[#161D2F] px-5 py-5"
                    >
                      <div className={MOCK_ROW_GRID}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
                            ESAT CAMP {module.builderSubject}
                          </span>
                        </div>
                        <div aria-hidden />
                        <div className="flex flex-wrap items-center justify-end gap-2.5">
                          <span
                            className={cn(QUIET_BTN, "opacity-45")}
                            aria-disabled="true"
                            title="Full paper download coming soon"
                          >
                            Full
                            <Download
                              className="h-4 w-4 opacity-80"
                              aria-hidden
                            />
                          </span>
                          {firstSlot?.startHref ? (
                            <Link
                              href={firstSlot.startHref}
                              className={cn(
                                ACTION_BTN,
                                "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
                              )}
                            >
                              Start now
                              <Play
                                className="h-4 w-4 fill-current opacity-80"
                                aria-hidden
                              />
                            </Link>
                          ) : (
                            <span
                              className={cn(
                                ACTION_BTN,
                                "bg-[#3B82F6] text-white opacity-45",
                              )}
                              aria-disabled="true"
                              title="Coming soon in the simulator"
                            >
                              Start now
                              <Play
                                className="h-4 w-4 fill-current opacity-80"
                                aria-hidden
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })
              : slots.map((slot) => (
                  <li
                    key={slot.mockNumber}
                    role="listitem"
                    className="rounded bg-[#161D2F] px-5 py-5"
                  >
                    <div className={MOCK_ROW_GRID}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
                          ESAT CAMP Mock {slot.letter}
                        </span>
                      </div>

                      <div>
                        <DifficultyStars rating={slot.difficultyStars} />
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {slot.paperHref ? (
                          <a
                            href={slot.paperHref}
                            download
                            aria-label={`Download ${slot.displayName} paper PDF`}
                            className={QUIET_BTN}
                          >
                            Paper
                            <Download
                              className="h-4 w-4 opacity-80"
                              aria-hidden
                            />
                          </a>
                        ) : null}
                        {slot.answerKeyHref ? (
                          <a
                            href={slot.answerKeyHref}
                            download
                            aria-label={`Download ${slot.displayName} answer key PDF`}
                            className={QUIET_BTN}
                          >
                            Answers
                            <Download
                              className="h-4 w-4 opacity-80"
                              aria-hidden
                            />
                          </a>
                        ) : null}
                        {slot.startHref ? (
                          <Link
                            href={slot.startHref}
                            className={cn(
                              ACTION_BTN,
                              "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
                            )}
                            aria-label={`Start now: ${slot.displayName}`}
                          >
                            Start now
                            <Play
                              className="h-4 w-4 fill-current opacity-80"
                              aria-hidden
                            />
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              ACTION_BTN,
                              "bg-[#3B82F6] text-white opacity-45",
                            )}
                            aria-disabled="true"
                            title="Coming soon in the simulator"
                          >
                            Start now
                            <Play
                              className="h-4 w-4 fill-current opacity-80"
                              aria-hidden
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
