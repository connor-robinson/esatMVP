"use client";

/**
 * Multi-step score converter (one decision per screen): Year → Section(s) →
 * Marks → Results. Scoped to a single exam via the `exam` prop (the route
 * implies it), with cross-links to the other exams.
 *
 * Every number shown comes from the score-converter API (Supabase conversion
 * tables + official distribution CSVs). Framed as a historical proxy for ESAT
 * performance — never a literal ESAT score.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";
import {
  CONVERTER_EXAMS,
  EXAM_FULL_NAME,
  type Confidence,
  type ConverterExam,
  type ConvertResponse,
  type ConvertedSection,
  type ModuleColor,
  type SectionOption,
  type SectionsResponse,
  type YearOption,
  type YearsResponse,
} from "@/lib/scoreConverter/esatModules";

type Step = "year" | "sections" | "marks" | "scaled" | "results";

const COLOR_CLASSES: Record<
  ModuleColor,
  { activeBg: string; text: string; softBg: string; dot: string }
> = {
  maths: { activeBg: "bg-maths/20", text: "text-maths", softBg: "bg-maths/10", dot: "bg-maths" },
  physics: {
    activeBg: "bg-physics/20",
    text: "text-physics",
    softBg: "bg-physics/10",
    dot: "bg-physics",
  },
  chemistry: {
    activeBg: "bg-chemistry/20",
    text: "text-chemistry",
    softBg: "bg-chemistry/10",
    dot: "bg-chemistry",
  },
  biology: {
    activeBg: "bg-biology/20",
    text: "text-biology",
    softBg: "bg-biology/10",
    dot: "bg-biology",
  },
  advanced: {
    activeBg: "bg-advanced/20",
    text: "text-advanced",
    softBg: "bg-advanced/10",
    dot: "bg-advanced",
  },
  "tmua-accent": {
    activeBg: "bg-tmua-accent/20",
    text: "text-tmua-accent",
    softBg: "bg-tmua-accent/10",
    dot: "bg-tmua-accent",
  },
};

const stepMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
        <Check className="h-3 w-3" strokeWidth={2.5} /> High confidence
      </span>
    );
  }
  const label = confidence === "low" ? "Low confidence" : "Unavailable";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
      <AlertTriangle className="h-3 w-3" strokeWidth={2.5} /> {label}
    </span>
  );
}

function Stepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return setDraft(String(value));
    onChange(clamp(parsed));
  };
  return (
    <div className="flex h-12 items-center justify-between rounded-organic-lg bg-surface-subtle px-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 0}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-mid hover:text-text disabled:opacity-35"
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-12 bg-transparent text-center text-base font-bold tabular-nums text-text outline-none focus:outline-none focus:ring-0"
          aria-label={label}
        />
        <span className="shrink-0 text-sm font-medium text-text-muted">/ {max}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-mid hover:text-text disabled:opacity-35"
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "year", label: "Year" },
  { id: "sections", label: "Sections" },
  { id: "marks", label: "Marks" },
  { id: "results", label: "Result" },
];

function ProgressTrail({ step }: { step: Step }) {
  const activeId: Step = step === "scaled" ? "marks" : step;
  const activeIndex = STEP_LABELS.findIndex((s) => s.id === activeId);
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
              i <= activeIndex ? "text-text" : "text-text-subtle",
            )}
          >
            {s.label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <span
              className={cn(
                "h-1 w-6 rounded-full transition-colors",
                i < activeIndex ? "bg-secondary" : "bg-surface-mid",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ScoreConverter({ exam }: { exam: ConverterExam }) {
  const [step, setStep] = useState<Step>("year");

  const [years, setYears] = useState<YearOption[] | null>(null);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const [year, setYear] = useState<YearOption | null>(null);

  const [sections, setSections] = useState<SectionsResponse | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rawByKey, setRawByKey] = useState<Record<string, number>>({});
  const [scaledInput, setScaledInput] = useState("");

  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  // Reset everything when the exam (route) changes.
  useEffect(() => {
    setStep("year");
    setYears(null);
    setYearsError(null);
    setYear(null);
    setSections(null);
    setSelectedKeys([]);
    setRawByKey({});
    setScaledInput("");
    setResult(null);
    setResultError(null);
  }, [exam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/score-converter/years?exam=${exam}`);
        if (!res.ok) throw new Error("Failed to load years");
        const data = (await res.json()) as YearsResponse;
        if (!cancelled) setYears(data.years);
      } catch {
        if (!cancelled) setYearsError("Couldn't load available years. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam]);

  const selectYear = useCallback(
    async (opt: YearOption) => {
      setYear(opt);
      setSelectedKeys([]);
      setRawByKey({});
      setScaledInput("");
      setResult(null);
      setResultError(null);

      if (opt.mode === "scaled") {
        setStep("scaled");
        return;
      }

      setSectionsLoading(true);
      setStep("sections");
      try {
        const res = await fetch(
          `/api/score-converter/sections?exam=${exam}&year=${opt.year}`,
        );
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as SectionsResponse;
        setSections(data);
        if (data.mode === "scaled") setStep("scaled");
      } catch {
        setSections({ exam, year: opt.year, mode: "raw", options: [] });
      } finally {
        setSectionsLoading(false);
      }
    },
    [exam],
  );

  const toggleSection = (opt: SectionOption) => {
    setSelectedKeys((prev) => {
      if (prev.includes(opt.key)) return prev.filter((k) => k !== opt.key);
      if (prev.length >= 3) return prev;
      return [...prev, opt.key];
    });
    setRawByKey((prev) => ({ ...prev, [opt.key]: prev[opt.key] ?? 0 }));
  };

  const selectedOptions = useMemo(
    () => (sections?.options ?? []).filter((o) => selectedKeys.includes(o.key)),
    [sections, selectedKeys],
  );

  const runConvert = useCallback(async () => {
    if (!year) return;
    setResultLoading(true);
    setResultError(null);
    setStep("results");
    try {
      const payload =
        step === "scaled" || year.mode === "scaled"
          ? {
              exam,
              year: year.year,
              mode: "scaled",
              scaledScore: parseFloat(scaledInput),
            }
          : {
              exam,
              year: year.year,
              mode: "raw",
              selections: selectedOptions.map((o) => ({
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
      setResult((await res.json()) as ConvertResponse);
    } catch (e: any) {
      setResultError(e?.message || "Something went wrong.");
    } finally {
      setResultLoading(false);
    }
  }, [exam, year, step, scaledInput, selectedOptions, rawByKey]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, SectionOption[]>();
    for (const o of sections?.options ?? []) {
      const g = groups.get(o.group) ?? [];
      g.push(o);
      groups.set(o.group, g);
    }
    return [...groups.entries()];
  }, [sections]);

  const scaledValid = useMemo(() => {
    const n = parseFloat(scaledInput);
    return Number.isFinite(n) && n >= 1 && n <= 9;
  }, [scaledInput]);

  const goBack = () => {
    if (step === "results") {
      setStep(year?.mode === "scaled" ? "scaled" : "marks");
    } else if (step === "marks" || step === "scaled") {
      setStep(year?.mode === "scaled" ? "year" : "sections");
    } else if (step === "sections") {
      setStep("year");
    }
  };

  return (
    <Container size="md" className="py-10 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
          Exam Tools · Score Converter
        </p>
        <h1 className="mt-2 text-2xl font-bold text-text sm:text-3xl">
          {exam} score converter
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          Turn raw marks from a past {exam} paper into an estimated scaled score
          (1.0–9.0) and percentile. Use it as a historical proxy for ESAT-style
          performance — ESAT itself has no published conversion table, so this is
          an approximation, not an official ESAT score.
        </p>

        {/* Cross-links */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {CONVERTER_EXAMS.filter((e) => e !== exam).map((e) => (
            <Link
              key={e}
              href={`/tools/score-converter/${e.toLowerCase()}`}
              className="inline-flex items-center gap-1.5 rounded-organic-md bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            >
              Also taking {e}? Convert those scores
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </div>

      {/* Progress + back */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <ProgressTrail step={step} />
        {step !== "year" && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
      </div>

      <div className="rounded-organic-lg bg-surface-elevated p-5 sm:p-7 shadow-modal-card">
        <AnimatePresence mode="wait">
          {/* STEP: YEAR */}
          {step === "year" && (
            <motion.div key="year" {...stepMotion}>
              <h2 className="text-lg font-semibold text-text">
                Which year did you sit?
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Only years with official conversion data are shown.
              </p>
              {yearsError && (
                <p className="mt-4 text-sm text-error">{yearsError}</p>
              )}
              {!years && !yearsError && (
                <div className="mt-6 flex items-center gap-2 text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading years…
                </div>
              )}
              {years && (
                <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {years.map((y) => (
                    <button
                      key={y.year}
                      type="button"
                      onClick={() => selectYear(y)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-organic-md bg-surface-subtle px-3 py-4 text-center transition-all duration-fast ease-signature hover:bg-surface-mid active:scale-[0.97]",
                      )}
                    >
                      <span className="text-lg font-bold text-text">{y.year}</span>
                      {y.mode === "scaled" && (
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-tmua-accent">
                          Scaled entry
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {years && years.length === 0 && (
                <p className="mt-6 text-sm text-text-muted">
                  No conversion data is available for {exam} yet.
                </p>
              )}
            </motion.div>
          )}

          {/* STEP: SECTIONS */}
          {step === "sections" && (
            <motion.div key="sections" {...stepMotion}>
              <h2 className="text-lg font-semibold text-text">
                Which section(s)? <span className="text-text-muted">Pick up to 3</span>
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Each chip shows the legacy paper part and the ESAT module it maps to.
              </p>

              {sectionsLoading && (
                <div className="mt-6 flex items-center gap-2 text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sections…
                </div>
              )}

              {!sectionsLoading && groupedOptions.length === 0 && (
                <p className="mt-6 text-sm text-text-muted">
                  No convertible sections found for this sitting.
                </p>
              )}

              <div className="mt-5 space-y-5">
                {groupedOptions.map(([group, opts]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-subtle">
                      {group}
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {opts.map((o) => {
                        const selected = selectedKeys.includes(o.key);
                        const c = COLOR_CLASSES[o.color];
                        const disabled = !selected && selectedKeys.length >= 3;
                        return (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => toggleSection(o)}
                            disabled={disabled}
                            className={cn(
                              "flex items-start gap-3 rounded-organic-md p-3.5 text-left transition-all duration-fast ease-signature active:scale-[0.98]",
                              selected ? c.activeBg : "bg-surface-subtle hover:bg-surface-mid",
                              disabled && "cursor-not-allowed opacity-40",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                                selected ? c.dot : "bg-surface-mid",
                              )}
                            >
                              {selected && (
                                <Check className="h-3 w-3 text-background" strokeWidth={3} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-text">
                                {o.legacyLabel}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {o.moduleLabel && (
                                  <span className={cn("text-xs font-medium", c.text)}>
                                    {o.moduleLabel}
                                  </span>
                                )}
                                <span className="text-xs text-text-subtle">
                                  · out of {o.maxRaw}
                                </span>
                                {o.confidence !== "high" && (
                                  <AlertTriangle
                                    className="h-3 w-3 text-warning"
                                    strokeWidth={2.5}
                                  />
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {selectedOptions.some((o) => o.confidence !== "high") && (
                <div className="mt-5 flex items-start gap-2.5 rounded-organic-md bg-warning/10 p-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs leading-relaxed text-text-muted">
                    One or more selected sections used a non-standard or transitional
                    format, or has incomplete data. You can still convert it, but treat
                    the result with caution — details appear on the result card.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={selectedKeys.length === 0}
                  onClick={() => setStep("marks")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-background shadow-glow transition-all duration-fast",
                    "hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100",
                  )}
                >
                  Enter marks
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: MARKS */}
          {step === "marks" && (
            <motion.div key="marks" {...stepMotion}>
              <h2 className="text-lg font-semibold text-text">
                How many did you get right?
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Enter your correct-answer count for each section.
              </p>
              <div className="mt-5 space-y-4">
                {selectedOptions.map((o) => {
                  const c = COLOR_CLASSES[o.color];
                  return (
                    <div
                      key={o.key}
                      className="flex flex-col gap-3 rounded-organic-md bg-surface-subtle/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text">{o.legacyLabel}</p>
                        {o.moduleLabel && (
                          <p className={cn("text-xs font-medium", c.text)}>{o.moduleLabel}</p>
                        )}
                      </div>
                      <div className="w-full sm:w-44">
                        <Stepper
                          value={rawByKey[o.key] ?? 0}
                          max={o.maxRaw}
                          onChange={(v) => setRawByKey((p) => ({ ...p, [o.key]: v }))}
                          label={`${o.legacyLabel} marks`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={runConvert}
                  className="inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-background shadow-glow transition-all duration-fast hover:brightness-110 active:scale-[0.98]"
                >
                  See results
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: SCALED (TMUA 2024+) */}
          {step === "scaled" && (
            <motion.div key="scaled" {...stepMotion}>
              <h2 className="text-lg font-semibold text-text">
                Enter your TMUA scaled score
              </h2>
              <div className="mt-3 flex items-start gap-2.5 rounded-organic-md bg-tmua-accent/10 p-3.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-tmua-accent" />
                <p className="text-xs leading-relaxed text-text-muted">
                  From 2024, TMUA uses Rasch IRT scoring with no published
                  raw→scaled table, so enter the overall scaled score (1.0–9.0)
                  you were reported. We&apos;ll show where it sits in the current-scale
                  distribution.
                </p>
              </div>
              <div className="mt-5 max-w-[220px]">
                <input
                  type="text"
                  inputMode="decimal"
                  value={scaledInput}
                  onChange={(e) =>
                    setScaledInput(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="e.g. 6.8"
                  className="h-14 w-full rounded-organic-lg bg-surface-subtle px-4 text-center text-2xl font-bold tabular-nums text-text outline-none placeholder:text-text-subtle focus:outline-none focus:ring-0"
                  aria-label="TMUA scaled score"
                />
                {!scaledValid && scaledInput !== "" && (
                  <p className="mt-2 text-xs text-error">Enter a value between 1.0 and 9.0.</p>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!scaledValid}
                  onClick={runConvert}
                  className="inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-background shadow-glow transition-all duration-fast hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                >
                  See percentile
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: RESULTS */}
          {step === "results" && (
            <motion.div key="results" {...stepMotion}>
              {resultLoading && (
                <div className="flex items-center gap-2 py-8 text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Converting…
                </div>
              )}
              {resultError && (
                <div className="py-6">
                  <p className="text-sm text-error">{resultError}</p>
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-organic-md bg-surface-subtle px-4 py-2 text-sm font-medium text-text hover:bg-surface-mid"
                  >
                    <ArrowLeft className="h-4 w-4" /> Try again
                  </button>
                </div>
              )}
              {result && !resultLoading && (
                <ResultView result={result} onReset={() => setStep(year?.mode === "scaled" ? "scaled" : "marks")} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-text-subtle">
        Estimates are a historical proxy based on official {exam} data and are not
        an official ESAT score. ESAT reports a separate scaled score per module.
      </p>
    </Container>
  );
}

function ResultCard({ section }: { section: ConvertedSection }) {
  const c = COLOR_CLASSES[section.color];
  const hasScore = section.scaledScore != null;
  return (
    <div className={cn("rounded-organic-lg p-5", c.softBg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{section.legacyLabel}</p>
          {section.moduleLabel && (
            <p className={cn("text-xs font-medium", c.text)}>{section.moduleLabel}</p>
          )}
        </div>
        <ConfidenceBadge confidence={section.confidence} />
      </div>

      {hasScore ? (
        <div className="mt-4 flex items-end gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
              Scaled score
            </p>
            <p className={cn("text-4xl font-bold tabular-nums leading-none", c.text)}>
              {section.scaledScore?.toFixed(1)}
            </p>
            {section.raw != null && section.maxRaw != null && (
              <p className="mt-1 text-xs text-text-subtle">
                from {section.raw}/{section.maxRaw} correct
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
              Percentile
            </p>
            {section.percentile != null ? (
              <p className="text-2xl font-bold tabular-nums leading-none text-text">
                {section.percentile.toFixed(0)}
                <span className="text-base font-semibold text-text-muted">th</span>
              </p>
            ) : (
              <p className="text-sm text-text-muted">Not available</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">
          We couldn&apos;t convert this section — the underlying data is missing.
        </p>
      )}

      {section.percentile != null && (
        <p className="mt-3 text-sm text-text-muted">
          Scored above <span className="font-semibold text-text">{section.percentile.toFixed(0)}%</span> of candidates on this measure.
        </p>
      )}

      {section.newScaleEquivalent != null && (
        <p className="mt-2 text-xs text-text-muted">
          ≈ <span className="font-semibold text-text">{section.newScaleEquivalent.toFixed(1)}</span> on the
          post-2024 TMUA scale (percentile-anchored).
        </p>
      )}

      {section.fallbackFromYear != null && (
        <div className="mt-3 flex items-start gap-2 rounded-organic-md bg-warning/10 p-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-xs text-text-muted">
            This year&apos;s table was unavailable — showing the{" "}
            <span className="font-semibold text-text">{section.fallbackFromYear}</span> table as an
            approximation.
          </p>
        </div>
      )}

      {section.confidence !== "high" && section.reliabilityNote && (
        <div className="mt-3 flex items-start gap-2 rounded-organic-md bg-warning/10 p-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-text-muted">
            {section.reliabilityNote}
          </p>
        </div>
      )}
    </div>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: ConvertResponse;
  onReset: () => void;
}) {
  const scored = result.sections.filter((s) => s.scaledScore != null);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">
          {result.exam} {result.year} — estimated result
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <div className="space-y-3">
        {result.sections.map((s) => (
          <ResultCard key={s.key} section={s} />
        ))}
      </div>

      {result.mode === "raw" && scored.length > 1 && result.averageScaled != null && (
        <div className="mt-4 rounded-organic-lg bg-surface-subtle p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
            Average across selected sections
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-text">
            {result.averageScaled.toFixed(1)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            A simple mean of the sections above — not an ESAT score. ESAT reports a
            separate scaled score per module rather than one combined figure.
          </p>
        </div>
      )}
    </div>
  );
}
