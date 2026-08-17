"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Info, Layers, Loader2, X } from "lucide-react";
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

const MAX_SECTIONS = 3;
const OVERALL_CHART_KEY = "__overall__";

/** What the selected past paper proxies for in current admissions. */
function examTargetLabel(exam: ConverterExam): "ESAT" | "TMUA" {
  return exam === "TMUA" ? "TMUA" : "ESAT";
}

function predictedScoreLabel(exam: ConverterExam): string {
  return exam === "TMUA" ? "Predicted TMUA score" : "Predicted ESAT score";
}

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-text-muted";

const controlBase = "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const selectTriggerClass = cn(
  "flex h-10 w-full items-center justify-between gap-2 rounded-organic-lg px-3.5 text-base font-medium transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-subtle active:scale-[0.99]",
  "disabled:cursor-not-allowed disabled:opacity-45",
  controlBase,
);

const markInputClass = cn(
  "h-9 w-12 rounded-organic-md bg-background text-center text-base font-semibold tabular-nums text-text disabled:opacity-35",
  controlBase,
);

const COLOR_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

const COLOR_FILL_MUTED: Record<ModuleColor, string> = {
  maths: "border-2 border-maths/60 bg-surface-subtle",
  physics: "border-2 border-physics/60 bg-surface-subtle",
  chemistry: "border-2 border-chemistry/60 bg-surface-subtle",
  biology: "border-2 border-biology/60 bg-surface-subtle",
  advanced: "border-2 border-advanced/60 bg-surface-subtle",
  "tmua-accent": "border-2 border-tmua-accent/60 bg-surface-subtle",
};

const COLOR_FILL_CHECKED: Record<ModuleColor, string> = {
  maths: "border-2 border-maths bg-maths",
  physics: "border-2 border-physics bg-physics",
  chemistry: "border-2 border-chemistry bg-chemistry",
  biology: "border-2 border-biology bg-biology",
  advanced: "border-2 border-advanced bg-advanced",
  "tmua-accent": "border-2 border-tmua-accent bg-tmua-accent",
};

const COLOR_CARD_ACTIVE: Record<ModuleColor, string> = {
  maths: "bg-maths/5",
  physics: "bg-physics/5",
  chemistry: "bg-chemistry/5",
  biology: "bg-biology/5",
  advanced: "bg-advanced/5",
  "tmua-accent": "bg-tmua-accent/5",
};

const COLOR_RING_ACTIVE: Record<ModuleColor, string> = {
  maths: "ring-maths/30",
  physics: "ring-physics/30",
  chemistry: "ring-chemistry/30",
  biology: "ring-biology/30",
  advanced: "ring-advanced/30",
  "tmua-accent": "ring-tmua-accent/30",
};

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
        !disabled && !checked && "cursor-pointer hover:bg-surface-mid",
        !disabled && checked && "cursor-pointer hover:brightness-110",
        controlBase,
      )}
    >
      {checked && (
        <Check className="h-3 w-3 text-background" strokeWidth={3} aria-hidden />
      )}
    </button>
  );
}

function displaySubject(opt: SectionOption): string {
  if (opt.moduleLabel) return opt.moduleLabel;
  const tail = opt.legacyLabel.split("—")[1]?.trim();
  if (tail) {
    if (/both papers/i.test(tail)) return "Both papers";
    return tail;
  }
  return opt.legacyLabel.split("—")[0]?.trim() ?? opt.partName;
}

type ModernSelectOption = { value: string; label: string };

function ModernSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder = "—",
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
        className={cn(selectTriggerClass, open && "bg-surface-subtle")}
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
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-subtle py-1.5 shadow-modal-card"
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
                      ? "bg-surface-mid font-semibold text-text"
                      : "text-text-muted hover:bg-surface-mid/80 hover:text-text",
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
              Enter raw marks from a past {exam} paper. We look them up in official
              conversion tables and map them onto today&apos;s {target} 1.0–9.0 scale,
              then estimate your percentile from published distributions.
            </p>
            <p>
              This is a historical proxy for preparation — not an official score from
              UAT-UK or any university.
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
        <input
          type="text"
          inputMode="numeric"
          value={String(raw)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            if (Number.isNaN(n)) onRawChange(0);
            else onRawChange(Math.max(0, Math.min(section.maxRaw, n)));
          }}
          className={markInputClass}
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
      <div className="pointer-events-auto relative max-w-[14rem] rounded-organic-lg bg-secondary px-3 py-2 text-[11px] font-medium leading-snug text-background shadow-modal-card">
        Choose the year, or click here to change papers.
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

export function ScoreConverter({ initialExam }: { initialExam?: ConverterExam }) {
  const [exam, setExam] = useState<ConverterExam>(initialExam ?? "NSAA");

  useEffect(() => {
    if (initialExam) setExam(initialExam);
  }, [initialExam]);

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
  const resultsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setYearsLoading(true);
    setYear(null);
    setSections([]);
    setSelectedGroup("");
    setCheckedKeys([]);
    setRawByKey({});
    setScaledInput("");
    setTmuaPickMode(null);
    invalidateResults();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/score-converter/years?exam=${exam}`);
        if (!res.ok) throw new Error("years");
        const data = (await res.json()) as YearsResponse;
        if (!cancelled) {
          setYears(data.years.filter((y) => y.hasData || y.mode === "scaled"));
        }
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
    <Container size="lg" className="py-8 sm:py-10">
      <div className="mb-4 rounded-organic-xl bg-surface-elevated p-4 shadow-modal-card sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-text sm:text-3xl">
            ESAT Score Converter
          </h1>
          <ConverterInfoButton exam={exam} />
        </div>

        <div className="relative overflow-visible rounded-organic-lg bg-surface-mid/30 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex min-w-[10rem] flex-1 items-end gap-2" onPointerDown={dismissInputHint}>
              <ModernSelect
                label="Exam"
                value={exam}
                minWidth="5.5rem"
                options={CONVERTER_EXAMS.map((e) => ({ value: e, label: e }))}
                onChange={(next) => {
                  dismissInputHint();
                  setExam(next as ConverterExam);
                  setYear(null);
                  invalidateResults();
                }}
              />
              <ArrowRight className="mb-2.5 h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
              <span
                className={cn(
                  "mb-2 text-sm font-bold tracking-tight sm:text-base",
                  exam === "TMUA" ? "text-tmua-accent" : "text-secondary",
                )}
              >
                {examTargetLabel(exam)}
              </span>
            </div>

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

              {!isTmuaRaw && !sectionsLoading && partsInGroup.length === 0 && (
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
                          onClick={() => !disabled && toggleSection(s)}
                          onKeyDown={(e) => {
                            if (!disabled && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              toggleSection(s);
                            }
                          }}
                          className={cn(
                            "rounded-organic-lg px-4 py-3 transition-all duration-fast outline-none",
                            checked ? COLOR_CARD_ACTIVE[s.color] : "bg-surface-mid hover:bg-surface-subtle/60",
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
                          <div
                            className="mt-2.5 flex items-baseline gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={!checked}
                              value={checked ? String(rawByKey[s.key] ?? 0) : ""}
                              placeholder="—"
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                                if (Number.isNaN(n)) setRaw(s.key, 0);
                                else setRaw(s.key, Math.max(0, Math.min(s.maxRaw, n)));
                              }}
                              className={markInputClass}
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
          <ResultsPreviewPlaceholder exam={exam} year={year?.year} />
        )}

        {resultLoading && (
          <ResultsPreviewPlaceholder exam={exam} year={year?.year} loading />
        )}

        {resultError && hasCalculated && !resultLoading && (
          <div className="space-y-4">
            <ResultsPreviewPlaceholder exam={exam} year={year?.year} />
            <p className="text-center text-sm text-error">{resultError}</p>
          </div>
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

      <ScoreConverterFaq id="faq" />
    </Container>
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
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Switch subject view — tap a tab below to compare scores</span>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-organic-lg bg-surface-mid/50 p-1.5">
          {showOverall && (
            <button
              type="button"
              onClick={() => onSelectChart(OVERALL_CHART_KEY)}
              className={cn(
                "cursor-pointer rounded-organic-md px-3.5 py-2 text-sm font-semibold transition-all duration-fast",
                showingOverall
                  ? "bg-surface-elevated text-text shadow-sm"
                  : "text-text-muted hover:bg-surface-subtle/80 hover:text-text",
              )}
            >
              <span className={cn(showingOverall ? "text-text" : "text-text-muted")}>
                {predictedScoreLabel(exam)}
              </span>
              <span className="ml-1.5 tabular-nums text-text">
                {result.averageScaled!.toFixed(1)}
                {tmuaOverallEstimated != null && (
                  <span className="text-text-muted">
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
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectChart(s.key)}
                className={cn(
                  "cursor-pointer rounded-organic-md px-3.5 py-2 text-sm font-semibold transition-all duration-fast",
                  active
                    ? cn("bg-surface-elevated text-text shadow-sm", COLOR_CARD_ACTIVE[s.color])
                    : "text-text-muted hover:bg-surface-subtle/80 hover:text-text",
                )}
              >
                <span className={active ? c : cn(c, "opacity-80")}>
                  {s.moduleLabel ??
                    s.legacyLabel.split("—")[1]?.trim() ??
                    s.legacyLabel.split("—")[0]?.trim()}
                </span>
                {s.scaledScore != null && (
                  <span className="ml-1.5 tabular-nums text-text">
                    {s.scaledScore.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
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
        {predictedScoreLabel("TMUA")} · average across {result.sections.length} papers · {year}
      </p>

      {chartRows.length > 1 && (
        <PercentileMiniChart
          rows={chartRows}
          score={actualAvg}
          percentile={result.averagePercentile}
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
            {predictedScoreLabel(exam)}
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
            {year} table unavailable — using {section.fallbackFromYear} as approximation.
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
            {predictedScoreLabel(exam)}
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
          xLabel="Scaled score"
        />
      )}

      {section.newScaleEquivalent != null && (
        <p className="text-xs text-text-muted">
          ≈ {section.newScaleEquivalent.toFixed(1)} on post-2024 TMUA scale
        </p>
      )}

      {section.fallbackFromYear != null && (
        <NoteRow>
          {year} table unavailable — using {section.fallbackFromYear} as approximation.
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

/** Mirrors the real results layout before Calculate — ??? scores + ghost chart. */
function ResultsPreviewPlaceholder({
  exam,
  year,
  loading = false,
}: {
  exam: ConverterExam;
  year?: number;
  loading?: boolean;
}) {
  const accent =
    exam === "TMUA" ? COLOR_TEXT["tmua-accent"] : "text-text-subtle";

  return (
    <div className={cn("relative space-y-5", loading && "opacity-70")}>
      {loading && (
        <div className="absolute right-0 top-0 flex items-center gap-2 text-xs text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
          Calculating…
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {predictedScoreLabel(exam)}
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tracking-widest tabular-nums sm:text-5xl",
              accent,
              loading ? "animate-pulse opacity-50" : "opacity-40",
            )}
          >
            ???
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-subtle">Percentile</p>
          <p
            className={cn(
              "text-3xl font-bold tracking-wider tabular-nums sm:text-4xl",
              loading ? "animate-pulse text-text-subtle/50" : "text-text-subtle/40",
            )}
          >
            ??
          </p>
        </div>
      </div>

      <GhostPercentileChart />
    </div>
  );
}

/** Fuzzy stand-in for the distribution chart — same footprint, no real data. */
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

  const ghostScore = 5.5;
  const ghostX = toX(ghostScore);
  const ghostY = toY(6.2);

  return (
    <div className="relative" aria-hidden>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block blur-[2px] opacity-40 saturate-50"
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
