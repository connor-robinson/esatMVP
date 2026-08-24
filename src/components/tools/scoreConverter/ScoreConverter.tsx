"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cssVar } from "@/config/colors";
import { Container } from "@/components/layout/Container";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import {
  TmuaDualCurveChart,
  TmuaDualCurveExplainer,
} from "@/components/tools/scoreConverter/TmuaDualCurveChart";
import { ScoreConverterFaq } from "@/components/tools/scoreConverter/ScoreConverterFaq";
import { ScoreConverterQuestionBankPromo } from "@/components/tools/scoreConverter/ScoreConverterQuestionBankPromo";
import { ExplorePercentileLink } from "@/components/esat/ExplorePercentileLink";
import { fetchEsatTable, type EsatRow } from "@/lib/esat/percentiles";
import {
  CONVERTER_EXAMS,
  TMUA_IRT_FROM_YEAR,
  isTmuaPaper1Part,
  isTmuaPaper2Part,
  isTmuaOverallPart,
  resolvePercentileTableKey,
  type ConverterExam,
  type ConvertResponse,
  type ConvertedSection,
  type ModuleColor,
  type SectionOption,
  type SectionsResponse,
  type YearOption,
  type YearsResponse,
} from "@/lib/scoreConverter/esatModules";
import { APP_ROUTES, SOURCES } from "@/lib/seo/config";
import { SEO_LINKS } from "@/lib/seo/links";
import { trackEvent } from "@/lib/ga";
import {
  hasValidUrlPrefill,
  readSavedConverterState,
  writeSavedConverterState,
  type SavedConverterState,
} from "@/lib/scoreConverter/converterStorage";
import { parseConverterSearchParams } from "@/lib/scoreConverter/pastPaperConverterLinks";
import {
  ScoreConverterProvider,
  type ApplyTableSelection,
} from "@/components/tools/scoreConverter/ScoreConverterContext";

const MAX_SECTIONS = 3;
const OVERALL_CHART_KEY = "__overall__";

const EXAM_TITLE_COLOR: Record<ConverterExam, string> = {
  NSAA: "text-tmua-accent",
  ENGAA: "text-advanced",
  TMUA: "text-tmua-accent",
};

function converterTitleSuffix(exam: ConverterExam): string {
  return exam === "TMUA" ? " Score Converter" : " to ESAT Score Converter";
}

/** Inline exam picker in the page title; switches exam in place without a route transition. */
function ExamTitleDropdown({
  exam,
  onExamChange,
}: {
  exam: ConverterExam;
  onExamChange: (exam: ConverterExam) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex items-baseline">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Exam board: ${exam}. Change exam board.`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 rounded-organic-md px-1 -ml-1 transition-colors hover:bg-surface-mid/60",
          EXAM_TITLE_COLOR[exam],
          controlBase,
        )}
      >
        <span>{exam}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 opacity-80 transition-transform duration-fast sm:h-6 sm:w-6",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Exam board"
          className="absolute left-0 top-full z-50 mt-2 min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-subtle py-1.5 shadow-modal-card"
        >
          {CONVERTER_EXAMS.map((option) => {
            const isSelected = option === exam;
            return (
              <li key={option} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setOpen(false);
                    if (option !== exam) onExamChange(option);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-base transition-colors duration-fast",
                    isSelected
                      ? "bg-surface-neutral font-semibold text-text"
                      : "text-text-muted hover:bg-surface-neutral/80 hover:text-text",
                    controlBase,
                  )}
                >
                  <span className={cn("font-bold", EXAM_TITLE_COLOR[option])}>
                    {option}
                  </span>
                  {isSelected ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-secondary"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </span>
  );
}

/** What the selected past paper proxies for in current admissions. */
function examTargetLabel(exam: ConverterExam): "ESAT" | "TMUA" {
  return exam === "TMUA" ? "TMUA" : "ESAT";
}

function convertedScoreLabel(exam: ConverterExam): string {
  return exam === "TMUA" ? "Converted TMUA score" : "Converted ESAT score";
}

function overallPillLabel(exam: ConverterExam): string {
  return exam === "TMUA" ? "Overall TMUA score" : "Overall ESAT score";
}

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-text-muted";

const controlBase = "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const selectTriggerClass = cn(
  "flex h-10 w-full items-center justify-between gap-2 rounded-organic-lg px-3.5 text-base font-medium transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-neutral active:scale-[0.99]",
  "disabled:cursor-not-allowed disabled:opacity-45",
  controlBase,
);

const markInputClass = cn(
  "h-9 w-12 rounded-organic-md text-center text-base font-semibold tabular-nums text-text disabled:opacity-35",
  controlBase,
);

/** Subject card surfaces: selected state reads lighter than the default card. */
const SUBJECT_CARD_UNCHECKED =
  "bg-surface-mid hover:bg-surface-subtle/80 dark:hover:bg-surface-neutral/80";
const SUBJECT_CARD_CHECKED = "bg-surface-subtle dark:bg-surface-neutral";

function subjectMarkInputClass(checked: boolean) {
  return cn(
    markInputClass,
    checked
      ? "bg-background dark:bg-white/10"
      : "bg-surface-subtle dark:bg-surface-neutral",
  );
}

const COLOR_FILL_MUTED: Record<ModuleColor, string> = {
  maths: "border-2 border-maths/50 bg-surface-subtle dark:bg-surface-neutral",
  physics: "border-2 border-physics/50 bg-surface-subtle dark:bg-surface-neutral",
  chemistry: "border-2 border-chemistry/50 bg-surface-subtle dark:bg-surface-neutral",
  biology: "border-2 border-biology/50 bg-surface-subtle dark:bg-surface-neutral",
  advanced: "border-2 border-advanced/50 bg-surface-subtle dark:bg-surface-neutral",
  "tmua-accent":
    "border-2 border-tmua-accent/50 bg-surface-subtle dark:bg-surface-neutral",
};

const COLOR_FILL_CHECKED: Record<ModuleColor, string> = {
  maths: "border-2 border-maths/70 bg-maths/15",
  physics: "border-2 border-physics/70 bg-physics/15",
  chemistry: "border-2 border-chemistry/70 bg-chemistry/15",
  biology: "border-2 border-biology/70 bg-biology/15",
  advanced: "border-2 border-advanced/70 bg-advanced/15",
  "tmua-accent": "border-2 border-tmua-accent/70 bg-tmua-accent/15",
};

const COLOR_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

const CHART_ACCENT: Record<ModuleColor, string> = {
  maths: "var(--color-maths)",
  physics: "var(--color-physics)",
  chemistry: "var(--color-chemistry)",
  biology: "var(--color-biology)",
  advanced: "var(--color-advanced)",
  "tmua-accent": "var(--color-tmua-accent)",
};

const CHART_ACCENT_OVERALL = "var(--color-text)";

const TAB_INACTIVE = "bg-surface-mid hover:bg-surface-mid/80";
const TAB_ACTIVE = "bg-surface-subtle";

function SubjectCheckbox({
  checked,
  disabled,
  color,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  color: ModuleColor;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={cn(
        "flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-[5px] transition-all duration-fast",
        checked ? COLOR_FILL_CHECKED[color] : COLOR_FILL_MUTED[color],
        disabled && "cursor-not-allowed opacity-35",
        !disabled && !checked && "cursor-pointer hover:bg-surface-subtle dark:hover:bg-surface-neutral",
        !disabled && checked && "cursor-pointer hover:brightness-105",
        controlBase,
      )}
    >
      {checked && (
        <Check className={cn("h-3 w-3", COLOR_TEXT[color])} strokeWidth={3} aria-hidden />
      )}
    </button>
  );
}

function displaySubject(opt: SectionOption): string {
  if (opt.moduleLabel) return opt.moduleLabel;
  const tail = opt.legacyLabel.split(":")[1]?.trim();
  if (tail) {
    if (/both papers/i.test(tail)) return "Both papers";
    return tail;
  }
  return opt.legacyLabel.split(":")[0]?.trim() ?? opt.partName;
}

type ModernSelectOption = { value: string; label: string };

function ModernSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder = "-",
  minWidth = "5rem",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  minWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0" style={{ minWidth }}>
      <span className={fieldLabel}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(selectTriggerClass, open && "bg-surface-neutral")}
      >
        <span className={cn("truncate", !selected && "text-text-muted")}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-subtle transition-transform duration-fast",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-mid py-1.5 shadow-modal-card"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-base transition-colors duration-fast",
                    isSelected
                      ? "bg-surface-neutral font-semibold text-text"
                      : "text-text-muted hover:bg-surface-neutral/80 hover:text-text",
                    controlBase,
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.5} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type TmuaPickMode = "split" | "overall";

function ConverterInfoButton({ exam }: { exam: ConverterExam }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const target = examTargetLabel(exam);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        How it works
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-organic-lg bg-surface-elevated p-4 shadow-modal-card"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-text">How we convert scores</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-organic-sm p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs leading-relaxed text-text-muted">
            <p>
              We use official Cambridge conversion tables published year by year for
              each {exam} paper and section. Your raw mark is looked up in that
              year&apos;s table to get the official 1.0–9.0 scaled score for that
              sitting, then placed on the matching {target} score distribution to
              estimate a percentile.
            </p>
            <p>
              That historical mapping is from published data. It is not an official{" "}
              {target} result from UAT-UK or a university.
            </p>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
              Learn more
            </p>
            <Link
              href={SEO_LINKS.goodScore.href}
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              {SEO_LINKS.goodScore.label}
            </Link>
            <Link
              href={SEO_LINKS.pastPapers.href}
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              {SEO_LINKS.pastPapers.label}
            </Link>
            <Link
              href={`${APP_ROUTES.scoreConverter}#faq`}
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              Full FAQ
            </Link>
            <a
              href={SOURCES.results.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs font-medium text-secondary hover:underline"
            >
              {SOURCES.results.label}
            </a>
            <a
              href={SOURCES.esatTest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs font-medium text-secondary hover:underline"
            >
              {SOURCES.esatTest.label}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function RawMarkInput({
  value,
  maxRaw,
  disabled,
  placeholder = "-",
  className,
  onValueChange,
}: {
  value: number;
  maxRaw: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onValueChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));
  const externalValueRef = useRef(value);

  useEffect(() => {
    if (externalValueRef.current !== value) {
      externalValueRef.current = value;
      setDraft(String(value));
    }
  }, [value]);

  const commitDigits = useCallback(
    (digits: string) => {
      if (digits === "") {
        onValueChange(0);
        return;
      }
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) {
        onValueChange(Math.max(0, Math.min(maxRaw, n)));
      }
    },
    [maxRaw, onValueChange],
  );

  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      value={disabled ? "" : draft}
      placeholder={placeholder}
      onChange={(e) => {
        e.stopPropagation();
        const digits = e.target.value.replace(/\D/g, "");
        setDraft(digits);
        commitDigits(digits);
      }}
      onBlur={() => {
        if (draft === "") {
          setDraft("0");
          onValueChange(0);
          return;
        }
        const n = parseInt(draft, 10);
        const clamped = Number.isNaN(n) ? 0 : Math.max(0, Math.min(maxRaw, n));
        setDraft(String(clamped));
        onValueChange(clamped);
      }}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        e.stopPropagation();
        e.currentTarget.select();
      }}
      className={className}
    />
  );
}

function TmuaMarkField({
  section,
  raw,
  onRawChange,
}: {
  section: SectionOption;
  raw: number;
  onRawChange: (value: number) => void;
}) {
  const c = COLOR_TEXT[section.color];
  return (
    <div className="rounded-organic-lg bg-surface-mid px-4 py-3">
      <p className={cn("text-sm font-semibold", c)}>{displaySubject(section)}</p>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <RawMarkInput
          value={raw}
          maxRaw={section.maxRaw}
          onValueChange={onRawChange}
          className={subjectMarkInputClass(false)}
        />
        <span className="text-sm font-medium text-text-muted">/{section.maxRaw}</span>
      </div>
    </div>
  );
}

function InputHelperHint({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) {
  if (!open) return null;

  return (
    <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 -translate-x-1/2">
      <div className="pointer-events-auto relative max-w-[12rem] rounded-organic-lg bg-secondary px-3.5 py-2 text-sm font-semibold leading-tight tracking-tight text-background shadow-modal-card">
        Choose year.
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -right-1.5 -top-1.5 rounded-full bg-background/90 p-0.5 text-text-muted transition-colors hover:text-text"
          aria-label="Dismiss help"
        >
          <X className="h-3 w-3" />
        </button>
        <span
          className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-secondary"
          aria-hidden
        />
      </div>
    </div>
  );
}

function applySavedFormState(
  saved: SavedConverterState,
  setters: {
    setSelectedGroup: (value: string) => void;
    setCheckedKeys: (value: string[]) => void;
    setRawByKey: (value: Record<string, number>) => void;
    setTmuaPickMode: (value: TmuaPickMode | null) => void;
    setScaledInput: (value: string) => void;
  },
) {
  if (saved.selectedGroup) setters.setSelectedGroup(saved.selectedGroup);
  setters.setCheckedKeys(saved.checkedKeys);
  setters.setRawByKey(saved.rawByKey);
  if (saved.tmuaPickMode) setters.setTmuaPickMode(saved.tmuaPickMode);
  if (saved.scaledInput) setters.setScaledInput(saved.scaledInput);
}

export function ScoreConverter({
  initialExam,
  onExamChange,
  pageTitle,
  intro,
  beforeFaq,
}: {
  initialExam?: ConverterExam;
  onExamChange?: (exam: ConverterExam) => void;
  /** Static H1 for hub pages; exam picker moves to the control row. */
  pageTitle?: string;
  intro?: string;
  beforeFaq?: React.ReactNode;
}) {
  const [exam, setExam] = useState<ConverterExam>(initialExam ?? "NSAA");
  const yearsCacheRef = useRef<Partial<Record<ConverterExam, YearOption[]>>>({});
  const urlPrefillAppliedRef = useRef(false);
  const [pendingApply, setPendingApply] = useState<{
    exam: ConverterExam;
    year: number;
    paperName?: string;
    partName?: string;
  } | null>(null);

  useEffect(() => {
    if (initialExam) setExam(initialExam);
  }, [initialExam]);

  const handleExamChange = useCallback(
    (next: ConverterExam) => {
      if (next === exam) return;
      setExam(next);
      onExamChange?.(next);
      if (typeof window !== "undefined" && !pageTitle) {
        window.history.replaceState(
          window.history.state,
          "",
          `/tools/score-converter/${next.toLowerCase()}`,
        );
      }
    },
    [exam, onExamChange, pageTitle],
  );

  const applyTableSelection = useCallback<ApplyTableSelection>(
    (selection) => {
      if (selection.exam !== exam) {
        handleExamChange(selection.exam);
      }
      setPendingApply(selection);
      document
        .getElementById("score-converter")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [exam, handleExamChange],
  );

  useEffect(() => {
    let cancelled = false;
    for (const converterExam of CONVERTER_EXAMS) {
      if (yearsCacheRef.current[converterExam]) continue;
      void fetch(`/api/score-converter/years?exam=${converterExam}`)
        .then(async (res) => {
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as YearsResponse;
          yearsCacheRef.current[converterExam] = data.years.filter(
            (y) => y.hasData || y.mode === "scaled",
          );
        })
        .catch(() => {
          /* prefetch is optional */
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const [years, setYears] = useState<YearOption[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [year, setYear] = useState<YearOption | null>(null);

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [rawByKey, setRawByKey] = useState<Record<string, number>>({});
  const [scaledInput, setScaledInput] = useState("");
  const [tmuaPickMode, setTmuaPickMode] = useState<TmuaPickMode | null>(null);

  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const [activeChartKey, setActiveChartKey] = useState<string | null>(null);
  const [chartRows, setChartRows] = useState<EsatRow[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [showQuestionBankPromo, setShowQuestionBankPromo] = useState(false);
  const [showInputHint, setShowInputHint] = useState(true);
  const [pendingRestore, setPendingRestore] = useState<SavedConverterState | null>(
    null,
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  const applyingProgrammaticRef = useRef(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        exam: ConverterExam;
        year: number;
        paperName: string;
        partName: string;
      }>).detail;
      if (!detail?.exam) return;
      setExam(detail.exam);
      setPendingApply(detail);
    };
    window.addEventListener("score-converter:apply", handler);
    return () => window.removeEventListener("score-converter:apply", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (urlPrefillAppliedRef.current) return;

    const prefill = parseConverterSearchParams(
      new URLSearchParams(window.location.search),
    );
    if (
      prefill.year == null &&
      !prefill.exam &&
      !prefill.paperName &&
      !prefill.partName
    ) {
      return;
    }

    urlPrefillAppliedRef.current = true;

    // Hub pages honour ?exam=; exam-specific routes keep the path exam.
    const resolvedExam = pageTitle
      ? (prefill.exam ?? initialExam ?? exam)
      : (initialExam ?? prefill.exam ?? exam);

    if (pageTitle && resolvedExam !== exam) {
      setExam(resolvedExam);
    }

    if (prefill.year != null) {
      setPendingApply({
        exam: resolvedExam,
        year: prefill.year,
        paperName: prefill.paperName,
        partName: prefill.partName,
      });
    }
  }, [initialExam, exam, pageTitle]);

  const isScaledMode = year?.mode === "scaled";

  const isNsaaEngaa = exam === "NSAA" || exam === "ENGAA";
  const isTmuaRaw = exam === "TMUA" && !isScaledMode;

  const sectionGroups = useMemo(() => {
    const map = new Map<string, SectionOption[]>();
    for (const s of sections) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [sections]);

  const partsInGroup = useMemo(() => {
    if (!isNsaaEngaa) return sections;
    return sectionGroups.find(([g]) => g === selectedGroup)?.[1] ?? [];
  }, [sections, sectionGroups, selectedGroup, isNsaaEngaa]);

  const tmuaSections = useMemo(() => {
    if (!isTmuaRaw) {
      return { paper1: null, paper2: null, overall: null };
    }
    return {
      paper1: sections.find((s) => isTmuaPaper1Part(s.partName)) ?? null,
      paper2: sections.find((s) => isTmuaPaper2Part(s.partName)) ?? null,
      overall: sections.find((s) => isTmuaOverallPart(s.partName)) ?? null,
    };
  }, [sections, isTmuaRaw]);

  const tmuaReady = useMemo(() => {
    if (!isTmuaRaw || !tmuaPickMode) return false;
    if (tmuaPickMode === "overall") {
      const o = tmuaSections.overall;
      return o != null && checkedKeys.includes(o.key);
    }
    const { paper1, paper2 } = tmuaSections;
    return (
      paper1 != null &&
      paper2 != null &&
      checkedKeys.includes(paper1.key) &&
      checkedKeys.includes(paper2.key)
    );
  }, [isTmuaRaw, tmuaPickMode, tmuaSections, checkedKeys]);

  const checkedSections = useMemo(
    () => sections.filter((s) => checkedKeys.includes(s.key)),
    [sections, checkedKeys],
  );

  const scaledValid = useMemo(() => {
    const n = parseFloat(scaledInput);
    return Number.isFinite(n) && n >= 1 && n <= 9;
  }, [scaledInput]);

  const canCalculate = isScaledMode
    ? year != null && scaledValid
    : year != null && (isTmuaRaw ? tmuaReady : checkedSections.length > 0);

  const invalidateResults = useCallback(() => {
    setHasCalculated(false);
    setResult(null);
    setResultError(null);
    setActiveChartKey(null);
    setChartRows([]);
    setShowQuestionBankPromo(false);
  }, []);

  const persistUserState = useCallback(() => {
    if (applyingProgrammaticRef.current || !year) return;
    writeSavedConverterState({
      exam,
      year: year.year,
      mode: year.mode,
      selectedGroup: selectedGroup || undefined,
      checkedKeys,
      rawByKey,
      tmuaPickMode: tmuaPickMode ?? undefined,
      scaledInput: scaledInput || undefined,
    });
  }, [
    exam,
    year,
    selectedGroup,
    checkedKeys,
    rawByKey,
    tmuaPickMode,
    scaledInput,
  ]);

  useEffect(() => {
    if (applyingProgrammaticRef.current || !year) return;
    if (!canCalculate) return;
    persistUserState();
  }, [year, canCalculate, persistUserState]);

  useEffect(() => {
    if (hasValidUrlPrefill()) return;
    const saved = readSavedConverterState();
    if (!saved) return;
    const pageExam = initialExam ?? exam;
    if (saved.exam !== pageExam) return;
    setPendingRestore(saved);
  }, [initialExam, exam]);

  useEffect(() => {
    if (!pendingRestore || yearsLoading) return;
    if (pendingRestore.exam !== exam) {
      setPendingRestore(null);
      return;
    }
    const matchYear = years.find((y) => y.year === pendingRestore.year);
    if (!matchYear) {
      setPendingRestore(null);
      return;
    }
    if (year?.year !== pendingRestore.year) {
      applyingProgrammaticRef.current = true;
      setYear(matchYear);
      applyingProgrammaticRef.current = false;
    }
  }, [pendingRestore, years, yearsLoading, exam, year?.year]);

  useEffect(() => {
    if (!pendingRestore || !year || year.year !== pendingRestore.year) return;
    if (sectionsLoading) return;
    if (pendingRestore.mode === "scaled") {
      applyingProgrammaticRef.current = true;
      setScaledInput(pendingRestore.scaledInput ?? "");
      applyingProgrammaticRef.current = false;
      setPendingRestore(null);
      return;
    }
    if (sections.length === 0) {
      setPendingRestore(null);
      return;
    }

    applyingProgrammaticRef.current = true;
    applySavedFormState(pendingRestore, {
      setSelectedGroup,
      setCheckedKeys,
      setRawByKey,
      setTmuaPickMode,
      setScaledInput,
    });
    applyingProgrammaticRef.current = false;
    setPendingRestore(null);
  }, [pendingRestore, year, sections, sectionsLoading]);

  useEffect(() => {
    setYear(null);
    setSections([]);
    setSelectedGroup("");
    setCheckedKeys([]);
    setRawByKey({});
    setScaledInput("");
    setTmuaPickMode(null);
    invalidateResults();

    const cached = yearsCacheRef.current[exam];
    if (cached) {
      setYears(cached);
      setYearsLoading(false);
      return;
    }

    setYearsLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/score-converter/years?exam=${exam}`);
        if (!res.ok) throw new Error("years");
        const data = (await res.json()) as YearsResponse;
        const nextYears = data.years.filter((y) => y.hasData || y.mode === "scaled");
        yearsCacheRef.current[exam] = nextYears;
        if (!cancelled) setYears(nextYears);
      } catch {
        if (!cancelled) setYears([]);
      } finally {
        if (!cancelled) setYearsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, invalidateResults]);

  useEffect(() => {
    if (!year || year.mode === "scaled") {
      setSections([]);
      setCheckedKeys([]);
      return;
    }

    setSectionsLoading(true);
    setCheckedKeys([]);
    setRawByKey({});
    setTmuaPickMode(null);
    invalidateResults();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/score-converter/sections?exam=${exam}&year=${year.year}`,
        );
        if (!res.ok) throw new Error("sections");
        const data = (await res.json()) as SectionsResponse;
        if (!cancelled) setSections(data.options);
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, year, invalidateResults]);

  useEffect(() => {
    if (sectionGroups.length === 0) {
      setSelectedGroup("");
      return;
    }
    setSelectedGroup((prev) =>
      sectionGroups.some(([g]) => g === prev) ? prev : sectionGroups[0][0],
    );
  }, [sectionGroups]);

  useEffect(() => {
    if (!pendingApply || pendingApply.exam === exam) return;
    if (pageTitle) {
      setExam(pendingApply.exam);
      return;
    }
    handleExamChange(pendingApply.exam);
  }, [pendingApply, exam, pageTitle, handleExamChange]);

  useEffect(() => {
    if (!pendingApply || pendingApply.exam !== exam) return;
    const matchYear = years.find((y) => y.year === pendingApply.year);
    if (matchYear && year?.year !== pendingApply.year) {
      setYear(matchYear);
    }
  }, [pendingApply, exam, years, year]);

  const handleGroupChange = (group: string) => {
    invalidateResults();
    setSelectedGroup(group);
    setCheckedKeys((prev) =>
      prev.filter((k) => sections.some((s) => s.key === k && s.group === group)),
    );
  };

  const selectTmuaMode = (mode: TmuaPickMode) => {
    invalidateResults();
    setTmuaPickMode(mode);
    const { paper1, paper2, overall } = tmuaSections;
    if (mode === "split" && paper1 && paper2) {
      setCheckedKeys([paper1.key, paper2.key]);
      setRawByKey((r) => ({
        ...r,
        [paper1.key]: r[paper1.key] ?? 0,
        [paper2.key]: r[paper2.key] ?? 0,
      }));
      return;
    }
    if (mode === "overall" && overall) {
      setCheckedKeys([overall.key]);
      setRawByKey((r) => ({ ...r, [overall.key]: r[overall.key] ?? 0 }));
    }
  };

  useEffect(() => {
    if (!pendingApply || !year || pendingApply.year !== year.year) return;
    if (sections.length === 0 || sectionsLoading) return;

    // Year-only prefill: leave section choice to the user.
    if (!pendingApply.paperName && !pendingApply.partName) {
      setPendingApply(null);
      return;
    }

    if (pendingApply.paperName && pendingApply.partName) {
      const match = sections.find(
        (s) =>
          s.paperName === pendingApply.paperName &&
          s.partName === pendingApply.partName,
      );
      if (!match) {
        // Invalid section/part: keep the year, ignore the bad identifiers.
        setPendingApply(null);
        return;
      }

      if (isTmuaRaw) {
        if (isTmuaOverallPart(match.partName)) {
          selectTmuaMode("overall");
        } else {
          selectTmuaMode("split");
        }
      } else if (isNsaaEngaa) {
        setSelectedGroup(match.group);
        setCheckedKeys([match.key]);
        setRawByKey((prev) => ({ ...prev, [match.key]: prev[match.key] ?? 0 }));
      }

      setPendingApply(null);
      return;
    }

    // Section/group only (no specific part): open the right group or TMUA mode.
    if (pendingApply.paperName && isNsaaEngaa) {
      const groupMatch = sections.find(
        (s) =>
          s.group === pendingApply.paperName ||
          s.paperName === pendingApply.paperName,
      );
      if (groupMatch) setSelectedGroup(groupMatch.group);
    } else if (pendingApply.paperName && isTmuaRaw) {
      if (isTmuaOverallPart(pendingApply.paperName)) {
        selectTmuaMode("overall");
      } else if (tmuaSections.paper1 && tmuaSections.paper2) {
        selectTmuaMode("split");
      }
    }

    setPendingApply(null);
  }, [
    pendingApply,
    year,
    sections,
    sectionsLoading,
    isTmuaRaw,
    isNsaaEngaa,
    tmuaSections.paper1,
    tmuaSections.paper2,
  ]);

  const toggleSection = (opt: SectionOption) => {
    invalidateResults();
    setCheckedKeys((prev) => {
      if (prev.includes(opt.key)) {
        return prev.filter((k) => k !== opt.key);
      }
      if (prev.length >= MAX_SECTIONS) return prev;
      setRawByKey((r) => ({ ...r, [opt.key]: r[opt.key] ?? 0 }));
      return [...prev, opt.key];
    });
  };

  const setRaw = (key: string, value: number) => {
    invalidateResults();
    setRawByKey((prev) => ({ ...prev, [key]: value }));
  };

  const dismissInputHint = useCallback(() => {
    setShowInputHint(false);
  }, []);

  const runConvert = async () => {
    if (!year || !canCalculate) return;
    setResultLoading(true);
    setResultError(null);
    setHasCalculated(true);
    setResult(null);
    setChartRows([]);
    setActiveChartKey(null);

    try {
      const payload = isScaledMode
        ? { exam, year: year.year, mode: "scaled", scaledScore: parseFloat(scaledInput) }
        : {
            exam,
            year: year.year,
            mode: "raw",
            selections: checkedSections.map((o) => ({
              paperName: o.paperName,
              partName: o.partName,
              legacyLabel: o.legacyLabel,
              raw: rawByKey[o.key] ?? 0,
            })),
          };
      const res = await fetch("/api/score-converter/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Conversion failed");
      }
      const data = (await res.json()) as ConvertResponse;
      setResult(data);
      const isMulti = data.sections.length > 1;
      setActiveChartKey(
        isMulti ? OVERALL_CHART_KEY : (data.sections[0]?.key ?? null),
      );
      setShowQuestionBankPromo(true);
      trackEvent("converter_calculation_completed", {
        exam,
        year: year.year,
        example: false,
      });
      persistUserState();
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e: unknown) {
      setResult(null);
      setShowQuestionBankPromo(false);
      setResultError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setResultLoading(false);
    }
  };

  const activeSection = useMemo(
    () => result?.sections.find((s) => s.key === activeChartKey) ?? result?.sections[0] ?? null,
    [result, activeChartKey],
  );

  useEffect(() => {
    const isTmuaLegacy =
      exam === "TMUA" && year && year.year < TMUA_IRT_FROM_YEAR;
    if (
      !result ||
      !year ||
      activeChartKey === OVERALL_CHART_KEY ||
      activeSection?.scaledScore == null ||
      activeSection.tmuaDualCurve ||
      activeSection.chartRows ||
      isTmuaLegacy
    ) {
      setChartRows([]);
      return;
    }

    const sectionOpt = sections.find((s) => s.key === activeSection.key);
    const partName = isScaledMode
      ? "Paper 1"
      : sectionOpt?.partName ?? activeSection.legacyLabel;
    const tableKey = resolvePercentileTableKey(exam, year.year, partName);
    if (!tableKey) {
      setChartRows([]);
      return;
    }

    let cancelled = false;
    setChartLoading(true);
    fetchEsatTable(tableKey)
      .then((rows) => {
        if (!cancelled) setChartRows(rows);
      })
      .catch(() => {
        if (!cancelled) setChartRows([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result, exam, year, isScaledMode, activeSection, sections]);

  return (
    <ScoreConverterProvider applyTableSelection={applyTableSelection}>
    <Container id="score-converter" size="lg" className="scroll-mt-24 py-8 sm:py-10">
      <div className="mb-4 rounded-organic-xl bg-surface-elevated p-4 shadow-modal-card sm:p-5">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          {pageTitle ? (
            <h1 className="text-xl font-bold tracking-tight text-text sm:text-3xl">
              {pageTitle}
            </h1>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-text sm:text-3xl">
              <ExamTitleDropdown exam={exam} onExamChange={handleExamChange} />
              <span>{converterTitleSuffix(exam)}</span>
            </h1>
          )}
          <ConverterInfoButton exam={exam} />
        </div>
        {intro ? (
          <p className="mb-3 w-full text-sm font-medium leading-snug tracking-tight text-text-muted sm:text-base">
            {intro}
          </p>
        ) : null}

        <div className="relative overflow-visible rounded-organic-lg bg-background/50 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            {pageTitle ? (
              <div className="min-w-[6rem] flex-1">
                <ModernSelect
                  label="Exam"
                  value={exam}
                  minWidth="6rem"
                  options={CONVERTER_EXAMS.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  onChange={(next) => handleExamChange(next as ConverterExam)}
                />
              </div>
            ) : null}
            <div className="relative min-w-[6rem] flex-1" onPointerDown={dismissInputHint}>
              <InputHelperHint open={showInputHint} onDismiss={dismissInputHint} />
              <ModernSelect
                label="Year"
                value={year ? String(year.year) : ""}
                minWidth="5rem"
                disabled={yearsLoading || years.length === 0}
                placeholder={yearsLoading ? "…" : "Choose year"}
                options={years.map((y) => ({
                  value: String(y.year),
                  label: String(y.year),
                }))}
                onChange={(next) => {
                  dismissInputHint();
                  setPendingRestore(null);
                  const opt = years.find((y) => y.year === Number(next)) ?? null;
                  setYear(opt);
                  setScaledInput("");
                  setCheckedKeys([]);
                  setRawByKey({});
                  setTmuaPickMode(null);
                  invalidateResults();
                }}
              />
            </div>

            <div className="min-w-[7rem] flex-1">
              {isNsaaEngaa && !isScaledMode ? (
                <ModernSelect
                  label="Section"
                  value={year ? selectedGroup : ""}
                  minWidth="7rem"
                  disabled={!year || sectionsLoading || sectionGroups.length === 0}
                  placeholder={!year ? "Choose year first" : sectionsLoading ? "…" : "Choose section"}
                  options={sectionGroups.map(([group]) => ({
                    value: group,
                    label: group,
                  }))}
                  onChange={handleGroupChange}
                />
              ) : year && isScaledMode ? (
                <label className="block">
                  <span className={fieldLabel}>Official scaled score</span>
                  <div className="flex h-10 items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={scaledInput}
                      onChange={(e) => {
                        invalidateResults();
                        setScaledInput(e.target.value.replace(/[^0-9.]/g, ""));
                      }}
                      placeholder="6.8"
                      className={cn(markInputClass, "w-14 bg-background")}
                    />
                    <span className="text-sm font-medium text-text-muted">/9</span>
                  </div>
                </label>
              ) : (
                <div>
                  <span className={fieldLabel}>Section</span>
                  <p className="flex h-10 items-center rounded-organic-lg bg-surface-subtle px-3 text-sm text-text-muted">
                    Choose year first
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void runConvert()}
              disabled={!canCalculate || resultLoading}
              className={cn(
                "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-organic-lg bg-secondary px-5 text-sm font-semibold text-background transition-all duration-fast",
                "hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100",
              )}
            >
              {resultLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="sr-only">Calculating</span>
                </>
              ) : (
                <>
                  <span>Calculate</span>
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>

          {year && !isScaledMode && (
            <div className="mt-4 border-t border-border-subtle/60 pt-4">
              {sectionsLoading && (
                <span className="text-sm text-text-muted">Loading subjects…</span>
              )}

              {isTmuaRaw && !sectionsLoading && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-text-muted">How are you scoring?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        dismissInputHint();
                        selectTmuaMode("split");
                      }}
                      onFocus={dismissInputHint}
                      disabled={!tmuaSections.paper1 || !tmuaSections.paper2}
                      className={cn(
                        "flex items-start gap-3 rounded-organic-lg bg-surface-mid px-4 py-3.5 text-left transition-all duration-fast",
                        "hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40",
                        tmuaPickMode === "split" && "bg-surface-subtle ring-1 ring-secondary/20",
                        controlBase,
                      )}
                    >
                      <input
                        type="radio"
                        name="tmua-mode"
                        checked={tmuaPickMode === "split"}
                        onChange={() => {
                          dismissInputHint();
                          selectTmuaMode("split");
                        }}
                        className={cn("mt-0.5 h-4 w-4 shrink-0 accent-secondary", controlBase)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-text">
                          Thinking + Reasoning
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          Separate marks for Paper 1 and Paper 2
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        dismissInputHint();
                        selectTmuaMode("overall");
                      }}
                      onFocus={dismissInputHint}
                      disabled={!tmuaSections.overall}
                      className={cn(
                        "flex items-start gap-3 rounded-organic-lg bg-surface-mid px-4 py-3.5 text-left transition-all duration-fast",
                        "hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40",
                        tmuaPickMode === "overall" && "bg-surface-subtle ring-1 ring-secondary/20",
                        controlBase,
                      )}
                    >
                      <input
                        type="radio"
                        name="tmua-mode"
                        checked={tmuaPickMode === "overall"}
                        onChange={() => {
                          dismissInputHint();
                          selectTmuaMode("overall");
                        }}
                        className={cn("mt-0.5 h-4 w-4 shrink-0 accent-secondary", controlBase)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-text">Both papers</span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          One combined overall score (0-40 raw)
                        </span>
                      </span>
                    </button>
                  </div>

                  {tmuaPickMode === "split" && tmuaSections.paper1 && tmuaSections.paper2 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div onPointerDown={dismissInputHint}>
                        <TmuaMarkField
                          section={tmuaSections.paper1}
                          raw={rawByKey[tmuaSections.paper1.key] ?? 0}
                          onRawChange={(v) => setRaw(tmuaSections.paper1!.key, v)}
                        />
                      </div>
                      <div onPointerDown={dismissInputHint}>
                        <TmuaMarkField
                          section={tmuaSections.paper2}
                          raw={rawByKey[tmuaSections.paper2.key] ?? 0}
                          onRawChange={(v) => setRaw(tmuaSections.paper2!.key, v)}
                        />
                      </div>
                    </div>
                  )}

                  {tmuaPickMode === "overall" && tmuaSections.overall && (
                    <div onPointerDown={dismissInputHint}>
                      <TmuaMarkField
                        section={tmuaSections.overall}
                        raw={rawByKey[tmuaSections.overall.key] ?? 0}
                        onRawChange={(v) => setRaw(tmuaSections.overall!.key, v)}
                      />
                    </div>
                  )}
                </div>
              )}

              {!isTmuaRaw && !sectionsLoading && sections.length === 0 && year && (
                <span className="text-sm text-text-muted">
                  No conversion sections are available for {exam} {year.year}. Try another year.
                </span>
              )}
              {!isTmuaRaw && !sectionsLoading && sections.length > 0 && partsInGroup.length === 0 && (
                <span className="text-sm text-text-muted">No subjects for this section.</span>
              )}
              {!isTmuaRaw && !sectionsLoading && partsInGroup.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-muted">
                    Select subjects and enter raw marks (up to {MAX_SECTIONS})
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {partsInGroup.map((s) => {
                      const checked = checkedKeys.includes(s.key);
                      const disabled = !checked && checkedKeys.length >= MAX_SECTIONS;
                      const c = COLOR_TEXT[s.color];
                      return (
                        <div
                          key={s.key}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          aria-pressed={checked}
                          onClick={() => !disabled && toggleSection(s)}
                          onKeyDown={(e) => {
                            if (!disabled && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              toggleSection(s);
                            }
                          }}
                          className={cn(
                            "rounded-organic-lg px-4 py-3 transition-all duration-fast outline-none",
                            checked ? SUBJECT_CARD_CHECKED : SUBJECT_CARD_UNCHECKED,
                            disabled && "opacity-35",
                            !disabled && "cursor-pointer",
                            controlBase,
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <SubjectCheckbox
                              checked={checked}
                              disabled={disabled}
                              color={s.color}
                              onChange={() => toggleSection(s)}
                            />
                            <span className={cn("truncate text-sm font-semibold", c)}>
                              {displaySubject(s)}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-baseline gap-1.5">
                            <RawMarkInput
                              value={rawByKey[s.key] ?? 0}
                              maxRaw={s.maxRaw}
                              disabled={!checked}
                              placeholder="-"
                              onValueChange={(v) => setRaw(s.key, v)}
                              className={subjectMarkInputClass(checked)}
                            />
                            <span className="text-sm font-medium text-text-muted">
                              /{s.maxRaw}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ScoreConverterQuestionBankPromo
        open={showQuestionBankPromo}
        exam={exam}
        onDismiss={() => setShowQuestionBankPromo(false)}
        className="mb-5"
      />

      <div
        ref={resultsRef}
        className="mb-5 min-h-[240px] scroll-mt-24 rounded-organic-xl bg-surface-elevated p-5 shadow-modal-card sm:min-h-[280px] sm:p-6"
      >
        {!hasCalculated && !resultLoading && !resultError && (
          <ResultsPreviewPlaceholder exam={exam} />
        )}

        {resultLoading && (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
            Calculating…
          </div>
        )}

        {resultError && hasCalculated && !resultLoading && (
          <p className="flex min-h-[160px] items-center justify-center px-4 text-center text-sm text-error">
            {resultError}
          </p>
        )}

        {result && !resultLoading && (
          <ResultsPanel
            result={result}
            exam={exam}
            year={year!.year}
            activeSection={activeSection}
            activeChartKey={activeChartKey}
            onSelectChart={setActiveChartKey}
            chartRows={chartRows}
            chartLoading={chartLoading}
          />
        )}
      </div>

      {beforeFaq ? <div className="mb-5">{beforeFaq}</div> : null}

      <ScoreConverterFaq id="faq" />
    </Container>
    </ScoreConverterProvider>
  );
}

function SubjectViewPills({
  result,
  exam,
  showOverall,
  showingOverall,
  activeChartKey,
  tmuaOverallEstimated,
  onSelectChart,
}: {
  result: ConvertResponse;
  exam: ConverterExam;
  showOverall: boolean;
  showingOverall: boolean;
  activeChartKey: string | null;
  tmuaOverallEstimated: number | null;
  onSelectChart: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {showOverall && (
        <button
          type="button"
          onClick={() => onSelectChart(OVERALL_CHART_KEY)}
          className={cn(
            "rounded-organic-lg px-4 py-2.5 text-left transition-all duration-fast active:scale-[0.98]",
            showingOverall ? TAB_ACTIVE : TAB_INACTIVE,
            controlBase,
          )}
        >
          <span
            className={cn(
              "block text-[10px] font-semibold uppercase tracking-wide",
              showingOverall ? "text-text" : "text-text-muted",
            )}
          >
            {overallPillLabel(exam)}
          </span>
          <span className="mt-0.5 block text-lg font-bold tabular-nums text-text">
            {result.averageScaled!.toFixed(1)}
            {tmuaOverallEstimated != null && (
              <span className="text-sm font-semibold text-text-muted">
                {" → "}
                {tmuaOverallEstimated.toFixed(1)}
              </span>
            )}
          </span>
        </button>
      )}
      {result.sections.map((s) => {
        const active = s.key === activeChartKey;
        const c = COLOR_TEXT[s.color];
        const label =
          s.moduleLabel ??
          s.legacyLabel.split(":")[1]?.trim() ??
          s.legacyLabel.split(":")[0]?.trim();
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelectChart(s.key)}
            className={cn(
              "rounded-organic-lg px-4 py-2.5 text-left transition-all duration-fast active:scale-[0.98]",
              active ? TAB_ACTIVE : TAB_INACTIVE,
              controlBase,
            )}
          >
            <span
              className={cn(
                "block text-[10px] font-semibold uppercase tracking-wide",
                c,
                !active && "opacity-80",
              )}
            >
              {label}
            </span>
            {s.scaledScore != null && (
              <span className={cn("mt-0.5 block text-lg font-bold tabular-nums", c)}>
                {s.scaledScore.toFixed(1)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ResultsPanel({
  result,
  exam,
  year,
  activeSection,
  activeChartKey,
  onSelectChart,
  chartRows,
  chartLoading,
}: {
  result: ConvertResponse;
  exam: ConverterExam;
  year: number;
  activeSection: ConvertedSection | null;
  activeChartKey: string | null;
  onSelectChart: (key: string) => void;
  chartRows: EsatRow[];
  chartLoading: boolean;
}) {
  const multi = result.sections.length > 1;
  const showOverall = multi && result.averageScaled != null;
  const showingOverall = activeChartKey === OVERALL_CHART_KEY;
  const tmuaHasDual = result.sections.some((s) => s.tmuaDualCurve != null);
  const tmuaOverallEstimated = tmuaHasDual ? tmuaAverageEstimated(result.sections) : null;

  const sectionChartRows =
    activeSection?.chartRows && activeSection.chartRows.length > 1
      ? activeSection.chartRows
      : chartRows;

  return (
    <div className="space-y-5">
      {multi && (
        <SubjectViewPills
          result={result}
          exam={exam}
          showOverall={showOverall}
          showingOverall={showingOverall}
          activeChartKey={activeChartKey}
          tmuaOverallEstimated={tmuaOverallEstimated}
          onSelectChart={onSelectChart}
        />
      )}

      {showingOverall && showOverall ? (
        exam === "TMUA" && tmuaHasDual ? (
          <TmuaOverallResult result={result} year={year} />
        ) : (
          <OverallResult result={result} exam={exam} year={year} />
        )
      ) : activeSection ? (
        <SectionResult
          section={activeSection}
          exam={exam}
          year={year}
          chartRows={sectionChartRows}
          chartLoading={chartLoading && sectionChartRows.length === 0}
        />
      ) : (
        <p className="text-sm text-text-muted">No results.</p>
      )}
    </div>
  );
}

function tmuaAverageEstimated(sections: ConvertedSection[]): number | null {
  const vals = sections
    .map((s) => s.tmuaDualCurve?.student.estimatedScaled ?? s.newScaleEquivalent)
    .filter((v): v is number => v != null);
  if (vals.length === 0 || vals.length !== sections.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function formatPercentileDisplay(pct: number | null | undefined): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  return pct.toFixed(1);
}

function PercentileBlock({ percentile }: { percentile: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle/70">
        Percentile
      </p>
      <p className="text-2xl font-semibold tabular-nums text-text-muted sm:text-3xl">
        {percentile}
        <span className="text-base font-medium text-text-subtle sm:text-lg">th</span>
      </p>
    </div>
  );
}

function TmuaDualScoreRow({
  actual,
  estimated,
  raw,
  maxRaw,
  percentileLabel,
  colorClass,
}: {
  actual: number;
  estimated: number | null;
  raw: number | null;
  maxRaw: number | null;
  percentileLabel: string | null;
  colorClass: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className={cn("text-3xl font-bold tabular-nums sm:text-4xl", colorClass)}>
            {actual.toFixed(1)}
          </span>
          {estimated != null && (
            <>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-text-muted sm:h-6 sm:w-6"
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="text-3xl font-bold tabular-nums text-text-muted sm:text-4xl">
                {estimated.toFixed(1)}
              </span>
            </>
          )}
        </div>
        {raw != null && maxRaw != null && (
          <p className="mt-1 text-xs text-text-muted">
            {raw}/{maxRaw} raw
          </p>
        )}
      </div>
      {percentileLabel != null && <PercentileBlock percentile={percentileLabel} />}
    </div>
  );
}

function TmuaOverallResult({
  result,
  year,
}: {
  result: ConvertResponse;
  year: number;
}) {
  const actualAvg = result.averageScaled!;
  const estimatedAvg = tmuaAverageEstimated(result.sections);
  const percentileLabel = formatPercentileDisplay(result.averagePercentile);
  const chartRows = result.overallChartRows ?? [];
  const totalRaw = result.sections.reduce((sum, s) => sum + (s.raw ?? 0), 0);
  const totalMaxRaw = result.sections.reduce((sum, s) => sum + (s.maxRaw ?? 0), 0);

  return (
    <div className="space-y-5">
      <TmuaDualScoreRow
        actual={actualAvg}
        estimated={estimatedAvg}
        raw={totalMaxRaw > 0 ? totalRaw : null}
        maxRaw={totalMaxRaw > 0 ? totalMaxRaw : null}
        percentileLabel={percentileLabel}
        colorClass="text-tmua-accent"
      />
      <p className="text-xs text-text-muted">
        {convertedScoreLabel("TMUA")} · average across {result.sections.length} papers · {year}
      </p>

      {chartRows.length > 1 && (
        <PercentileMiniChart
          rows={chartRows}
          score={actualAvg}
          percentile={result.averagePercentile}
          accentColor={CHART_ACCENT["tmua-accent"]}
          xLabel="Scaled score"
        />
      )}
    </div>
  );
}

function OverallResult({
  result,
  exam,
  year,
}: {
  result: ConvertResponse;
  exam: ConverterExam;
  year: number;
}) {
  const percentileLabel = formatPercentileDisplay(result.averagePercentile);
  const chartRows = result.overallChartRows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {convertedScoreLabel(exam)}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-text sm:text-5xl">
            {result.averageScaled!.toFixed(1)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Average across {result.sections.length} subjects · {exam} {year}
          </p>
        </div>
        {percentileLabel != null && <PercentileBlock percentile={percentileLabel} />}
      </div>

      {chartRows.length > 1 && result.averageScaled != null && (
        <PercentileMiniChart
          rows={chartRows}
          score={result.averageScaled}
          percentile={result.averagePercentile}
          accentColor={CHART_ACCENT_OVERALL}
          xLabel="Scaled score"
        />
      )}
    </div>
  );
}

function SectionResult({
  section,
  exam,
  year,
  chartRows,
  chartLoading,
}: {
  section: ConvertedSection;
  exam: ConverterExam;
  year: number;
  chartRows: EsatRow[];
  chartLoading: boolean;
}) {
  const colorClass = COLOR_TEXT[section.color];
  const dual = section.tmuaDualCurve;
  const percentileLabel = formatPercentileDisplay(section.percentile);

  if (section.scaledScore == null) {
    return (
      <p className="text-sm text-text-muted">No conversion data for this section.</p>
    );
  }

  if (dual) {
    return (
      <div className="space-y-5">
        <TmuaDualScoreRow
          actual={dual.student.actualScaled}
          estimated={dual.student.estimatedScaled}
          raw={section.raw}
          maxRaw={section.maxRaw}
          percentileLabel={percentileLabel}
          colorClass={colorClass}
        />

        <TmuaDualCurveChart data={dual} />
        <TmuaDualCurveExplainer summary={dual.summary} />

        {section.fallbackFromYear != null && (
          <NoteRow>
            {year} table unavailable. Using {section.fallbackFromYear} as an approximation.
          </NoteRow>
        )}

        {section.confidence !== "high" && section.reliabilityNote && (
          <NoteRow warning>{section.reliabilityNote}</NoteRow>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {convertedScoreLabel(exam)}
          </p>
          <p className={cn("mt-1 text-4xl font-bold tabular-nums sm:text-5xl", colorClass)}>
            {section.scaledScore.toFixed(1)}
          </p>
          {(section.moduleLabel || section.legacyLabel) && (
            <p className="mt-0.5 text-xs text-text-muted">
              {section.moduleLabel ?? section.legacyLabel}
              {" · "}
              {exam} {year}
            </p>
          )}
          {section.raw != null && section.maxRaw != null && (
            <p className="mt-0.5 text-xs text-text-muted">
              {section.raw}/{section.maxRaw} correct
            </p>
          )}
        </div>
        {percentileLabel != null && <PercentileBlock percentile={percentileLabel} />}
      </div>

      {chartLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading chart…
        </div>
      )}

      {!chartLoading && chartRows.length > 1 && (
        <PercentileMiniChart
          rows={chartRows}
          score={section.scaledScore}
          percentile={section.percentile}
          accentColor={CHART_ACCENT[section.color]}
          xLabel="Scaled score"
        />
      )}

      {!chartLoading && chartRows.length > 1 && section.scaledScore != null && exam !== "TMUA" && (
        <ExplorePercentileLink
          score={section.scaledScore}
          moduleLabel={section.moduleLabel ?? section.legacyLabel}
          className="pt-1"
        />
      )}

      {section.newScaleEquivalent != null && (
        <p className="text-xs text-text-muted">
          ≈ {section.newScaleEquivalent.toFixed(1)} on post-2024 TMUA scale
        </p>
      )}

      {section.fallbackFromYear != null && (
        <NoteRow>
          {year} table unavailable. Using {section.fallbackFromYear} as an approximation.
        </NoteRow>
      )}

      {section.confidence !== "high" && section.reliabilityNote && (
        <NoteRow warning>{section.reliabilityNote}</NoteRow>
      )}
    </div>
  );
}

function NoteRow({
  children,
  warning,
}: {
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-organic-md p-3 text-xs leading-relaxed text-text-muted",
        warning ? "bg-warning/10" : "bg-surface-subtle",
      )}
    >
      {warning && (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      )}
      {children}
    </div>
  );
}

/** Decorative blurred stand-in before the user calculates. */
function ResultsPreviewPlaceholder({ exam }: { exam: ConverterExam }) {
  const accent =
    exam === "TMUA" ? COLOR_TEXT["tmua-accent"] : "text-text-subtle";

  return (
    <div className="relative space-y-5" aria-hidden>
      <div className="flex flex-wrap items-end justify-between gap-4 blur-[2px] opacity-50 saturate-50">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {convertedScoreLabel(exam)}
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tabular-nums sm:text-5xl",
              accent,
            )}
          >
            4.8
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-subtle">Percentile</p>
          <p className="text-3xl font-bold tabular-nums text-text-subtle sm:text-4xl">
            62.4
          </p>
        </div>
      </div>

      <GhostPercentileChart />
    </div>
  );
}

function GhostPercentileChart() {
  const w = 720;
  const h = 220;
  const pad = 32;
  const minX = 1;
  const maxX = 9;
  const densities = [
    { score: 1, d: 0.4 },
    { score: 2, d: 1.2 },
    { score: 3, d: 3.5 },
    { score: 4, d: 6.8 },
    { score: 5, d: 9.2 },
    { score: 6, d: 8.5 },
    { score: 7, d: 5.2 },
    { score: 8, d: 2.1 },
    { score: 9, d: 0.5 },
  ];
  const maxY = 10;

  const toX = (x: number) =>
    pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
  const toY = (y: number) => h - pad - (y / maxY) * (h - 2 * pad);

  const linePoints = densities.map((p) => `${toX(p.score)},${toY(p.d)}`).join(" ");
  const areaPoints = [
    `${toX(minX)},${h - pad}`,
    ...densities.map((p) => `${toX(p.score)},${toY(p.d)}`),
    `${toX(maxX)},${h - pad}`,
  ].join(" ");

  const ghostScore = 4.8;
  const ghostX = toX(ghostScore);
  const ghostY = toY(6.2);

  return (
    <div className="relative blur-[2px] opacity-50 saturate-50" aria-hidden>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
      >
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        <polygon
          points={areaPoints}
          fill="color-mix(in srgb, var(--color-maths) 12%, transparent)"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke={cssVar.textSubtle}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {[2, 4, 6, 8].map((t) => (
          <text
            key={t}
            x={toX(t)}
            y={h - pad + 14}
            fill={cssVar.textMuted}
            fontSize="9"
            textAnchor="middle"
            opacity={0.6}
          >
            {t}
          </text>
        ))}
        <line
          x1={ghostX}
          y1={pad}
          x2={ghostX}
          y2={h - pad}
          stroke="color-mix(in srgb, var(--color-maths) 25%, transparent)"
          strokeDasharray="4 4"
        />
        <circle
          cx={ghostX}
          cy={ghostY}
          r="4"
          fill={cssVar.maths}
          fillOpacity={0.35}
          stroke={cssVar.background}
          strokeWidth="2"
        />
        <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle" opacity={0.5}>
          Scaled score
        </text>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-elevated/30" />
    </div>
  );
}
