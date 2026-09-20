"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESAT_MOCK_MODULES,
  ESAT_MOCK_QUESTION_COUNT,
  ESAT_MOCK_TIME_LIMIT_MINUTES,
  findMockModule,
  fullMockSlots,
  mockSlotsForModule,
  type EsatMockAttemptSummary,
  type EsatMockModuleId,
  type EsatMockSlot,
} from "@/lib/esatMockTests/catalog";
import {
  startCatalogMockSitting,
  warmCatalogMockStart,
  type StartCatalogMockInput,
} from "@/lib/esatMockTests/startCatalogMockSitting";
import { trackMockPdfDownload } from "@/lib/downloads/mockPdfDownload";
import { RoadmapInfoPopover } from "@/components/papers/roadmap/RoadmapInfoPopover";
import { PastPaperGuestStartModal } from "@/components/papers/PastPaperGuestStartModal";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { usePaperSessionStore } from "@/store/paperSessionStore";

type EsatMockModuleSelectorProps = {
  /** Optional completion rows keyed by module id (logged-in only). */
  attemptsByModule?: Partial<
    Record<EsatMockModuleId, readonly EsatMockAttemptSummary[]>
  >;
  className?: string;
};

type TabId = EsatMockModuleId | "full";

const MOCK_ROW_GRID =
  "grid min-w-[56rem] grid-cols-[minmax(14rem,1.1fr)_6.5rem_minmax(22rem,1.4fr)] items-center gap-x-3";

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

function MockSlotRow({
  title,
  slot,
  moduleId,
  starting,
  onStart,
  onWarm,
}: {
  title: string;
  slot: EsatMockSlot;
  moduleId: EsatMockModuleId | "full";
  starting: boolean;
  onStart: () => void;
  onWarm: () => void;
}) {
  return (
    <li role="listitem" className="rounded bg-[#161D2F] px-5 py-5">
      <div className={MOCK_ROW_GRID}>
        <div className="min-w-0 space-y-1">
          <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
            {title}
          </span>
          <p className="text-sm text-[#94A3B8]">
            {ESAT_MOCK_QUESTION_COUNT} questions · {ESAT_MOCK_TIME_LIMIT_MINUTES}{" "}
            minutes · full-length ESAT-style
          </p>
        </div>

        <div>
          <DifficultyStars rating={slot.difficultyStars} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={starting}
            onMouseEnter={onWarm}
            onFocus={onWarm}
            onClick={onStart}
            className={cn(
              ACTION_BTN,
              "bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:opacity-45",
            )}
            aria-label={`Start mock: ${slot.displayName}`}
          >
            Start Mock
            <Play className="h-4 w-4 fill-current opacity-80" aria-hidden />
          </button>
          {slot.paperHref ? (
            <a
              href={slot.paperHref}
              download
              aria-label={`Download ${slot.displayName} PDF`}
              className={QUIET_BTN}
              onClick={() =>
                trackMockPdfDownload({
                  href: slot.paperHref!,
                  asset: "paper",
                  source: "esat_mock_tests",
                  moduleId,
                  mockNumber: slot.mockNumber,
                })
              }
            >
              Download PDF
              <Download className="h-4 w-4 opacity-80" aria-hidden />
            </a>
          ) : null}
          {slot.htmlHref ? (
            <Link
              href={slot.htmlHref}
              aria-label={`View questions and solutions for ${slot.displayName}`}
              className={QUIET_BTN}
            >
              View Questions &amp; Solutions
              <FileText className="h-4 w-4 opacity-80" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function EsatMockModuleSelector({
  attemptsByModule: _attemptsByModule,
  className,
}: EsatMockModuleSelectorProps) {
  const router = useRouter();
  const session = useSupabaseSession();
  const [selectedId, setSelectedId] = useState<TabId>("maths-1");
  const [pendingStart, setPendingStart] = useState<StartCatalogMockInput | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const isFullTab = selectedId === "full";
  const selectedModule = isFullTab
    ? findMockModule("maths-1")
    : findMockModule(selectedId);
  const slots = useMemo(
    () => (isFullTab ? fullMockSlots() : mockSlotsForModule(selectedModule)),
    [isFullTab, selectedModule],
  );

  const buildStartInput = useCallback(
    (mockNumber: number): StartCatalogMockInput =>
      isFullTab
        ? { mode: "full", mockNumber }
        : { mode: "module", moduleId: selectedModule.id, mockNumber },
    [isFullTab, selectedModule.id],
  );

  const launchSitting = useCallback(
    async (input: StartCatalogMockInput) => {
      if (starting) return;
      setStarting(true);
      setPendingStart(null);

      router.prefetch("/past-papers/solve");
      usePaperSessionStore.getState().beginSessionBootstrap();
      router.push("/past-papers/solve");

      try {
        await startCatalogMockSitting(input);
        usePaperSessionStore.getState().finishSessionBootstrap();
      } catch (err) {
        usePaperSessionStore
          .getState()
          .finishSessionBootstrap(
            err instanceof Error
              ? err.message
              : "Failed to start this mock.",
          );
      } finally {
        setStarting(false);
      }
    },
    [router, starting],
  );

  const requestStart = useCallback(
    (mockNumber: number) => {
      const input = buildStartInput(mockNumber);
      warmCatalogMockStart(input);
      if (!session?.user) {
        setPendingStart(input);
        return;
      }
      void launchSitting(input);
    },
    [buildStartInput, launchSitting, session?.user],
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
            {slots.map((slot) => (
              <MockSlotRow
                key={slot.mockNumber}
                title={
                  isFullTab
                    ? `ESAT CAMP Mock ${slot.letter}`
                    : `${selectedModule.fullLabel} Mock ${slot.mockNumber}`
                }
                slot={slot}
                moduleId={isFullTab ? "full" : selectedModule.id}
                starting={starting}
                onWarm={() => warmCatalogMockStart(buildStartInput(slot.mockNumber))}
                onStart={() => requestStart(slot.mockNumber)}
              />
            ))}
          </ul>
        </div>
      </div>

      <PastPaperGuestStartModal
        open={pendingStart != null}
        onClose={() => setPendingStart(null)}
        onContinueWithoutAccount={() => {
          if (!pendingStart) return;
          void launchSitting(pendingStart);
        }}
      />
    </div>
  );
}
