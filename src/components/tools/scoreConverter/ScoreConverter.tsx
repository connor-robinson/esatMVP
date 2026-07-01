"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import { fetchEsatTable, type EsatRow } from "@/lib/esat/percentiles";
import {
  CONVERTER_EXAMS,
  resolvePercentileTableKey,
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

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-organic-md bg-surface-mid px-3 text-sm text-text outline-none focus:outline-none focus:ring-0";

const COLOR_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

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
  const [sectionKey, setSectionKey] = useState("");

  const [raw, setRaw] = useState(0);
  const [scaledInput, setScaledInput] = useState("");

  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  const [chartRows, setChartRows] = useState<EsatRow[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const selectedSection = useMemo(
    () => sections.find((s) => s.key === sectionKey) ?? null,
    [sections, sectionKey],
  );

  const isScaledMode = year?.mode === "scaled";

  const scaledValid = useMemo(() => {
    const n = parseFloat(scaledInput);
    return Number.isFinite(n) && n >= 1 && n <= 9;
  }, [scaledInput]);

  const canConvert = isScaledMode
    ? scaledValid && year != null
    : selectedSection != null && year != null;

  // Load years when exam changes.
  useEffect(() => {
    setYearsLoading(true);
    setYear(null);
    setSections([]);
    setSectionKey("");
    setRaw(0);
    setScaledInput("");
    setResult(null);
    setResultError(null);
    setChartRows([]);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/score-converter/years?exam=${exam}`);
        if (!res.ok) throw new Error("years");
        const data = (await res.json()) as YearsResponse;
        if (!cancelled) setYears(data.years.filter((y) => y.hasData || y.mode === "scaled"));
      } catch {
        if (!cancelled) setYears([]);
      } finally {
        if (!cancelled) setYearsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam]);

  // Load sections when year changes (raw mode only).
  useEffect(() => {
    if (!year || year.mode === "scaled") {
      setSections([]);
      setSectionKey("");
      return;
    }

    setSectionsLoading(true);
    setSectionKey("");
    setRaw(0);
    setResult(null);
    setChartRows([]);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/score-converter/sections?exam=${exam}&year=${year.year}`,
        );
        if (!res.ok) throw new Error("sections");
        const data = (await res.json()) as SectionsResponse;
        if (!cancelled) {
          setSections(data.options);
          if (data.options.length === 1) {
            setSectionKey(data.options[0].key);
          }
        }
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, year]);

  const runConvert = useCallback(async () => {
    if (!year || !canConvert) return;
    setResultLoading(true);
    setResultError(null);
    try {
      const payload = isScaledMode
        ? { exam, year: year.year, mode: "scaled", scaledScore: parseFloat(scaledInput) }
        : {
            exam,
            year: year.year,
            mode: "raw",
            selections: [
              {
                paperName: selectedSection!.paperName,
                partName: selectedSection!.partName,
                legacyLabel: selectedSection!.legacyLabel,
                raw,
              },
            ],
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
    } catch (e: unknown) {
      setResult(null);
      setResultError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setResultLoading(false);
    }
  }, [exam, year, canConvert, isScaledMode, scaledInput, selectedSection, raw]);

  // Auto-convert when inputs settle.
  useEffect(() => {
    if (!canConvert) {
      setResult(null);
      setChartRows([]);
      return;
    }
    const t = setTimeout(() => void runConvert(), 450);
    return () => clearTimeout(t);
  }, [canConvert, runConvert, exam, year, sectionKey, raw, scaledInput]);

  // Load distribution curve for the chart.
  const resultSection = result?.sections[0] ?? null;

  useEffect(() => {
    if (!result || !year || resultSection?.scaledScore == null) {
      setChartRows([]);
      return;
    }

    const partName = isScaledMode
      ? "Paper 1"
      : selectedSection?.partName ?? resultSection.legacyLabel;
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
  }, [result, exam, year, isScaledMode, selectedSection?.partName, resultSection?.scaledScore, resultSection?.legacyLabel]);

  const handleExamChange = (next: ConverterExam) => {
    setExam(next);
    setYear(null);
  };

  const handleYearChange = (yearNum: number) => {
    const opt = years.find((y) => y.year === yearNum) ?? null;
    setYear(opt);
    setScaledInput("");
    setRaw(0);
  };

  const handleSectionChange = (key: string) => {
    setSectionKey(key);
    setRaw(0);
  };

  return (
    <Container size="md" className="py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-subtle">
          Score converter
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">
          Raw marks → scaled score
        </h1>
      </header>

      <div className="space-y-4 rounded-organic-lg bg-surface-elevated p-5 sm:p-6 shadow-modal-card">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-subtle">Exam</span>
            <select
              value={exam}
              onChange={(e) => handleExamChange(e.target.value as ConverterExam)}
              className={selectClass}
            >
              {CONVERTER_EXAMS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-subtle">Year</span>
            <select
              value={year?.year ?? ""}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={yearsLoading || years.length === 0}
              className={cn(selectClass, "disabled:opacity-40")}
            >
              <option value="" disabled>
                {yearsLoading ? "Loading…" : "Select year"}
              </option>
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                  {y.mode === "scaled" ? " (scaled)" : ""}
                </option>
              ))}
            </select>
          </label>

          {!isScaledMode && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-text-subtle">Section</span>
              <select
                value={sectionKey}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!year || sectionsLoading || sections.length === 0}
                className={cn(selectClass, "disabled:opacity-40")}
              >
                <option value="" disabled>
                  {sectionsLoading ? "Loading…" : "Select section"}
                </option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.legacyLabel}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {year && (
          <div className="pt-1">
            {isScaledMode ? (
              <label className="block max-w-[200px] space-y-1.5">
                <span className="text-xs font-medium text-text-subtle">
                  Scaled score (1.0–9.0)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={scaledInput}
                  onChange={(e) =>
                    setScaledInput(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="6.8"
                  className="h-10 w-full rounded-organic-md bg-surface-mid px-3 text-center text-lg font-semibold tabular-nums text-text outline-none focus:outline-none focus:ring-0"
                />
              </label>
            ) : selectedSection ? (
              <label className="block max-w-[200px] space-y-1.5">
                <span className="text-xs font-medium text-text-subtle">
                  Correct / {selectedSection.maxRaw}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(raw)}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    if (Number.isNaN(n)) setRaw(0);
                    else setRaw(Math.max(0, Math.min(selectedSection.maxRaw, n)));
                  }}
                  className="h-10 w-full rounded-organic-md bg-surface-mid px-3 text-center text-lg font-semibold tabular-nums text-text outline-none focus:outline-none focus:ring-0"
                />
              </label>
            ) : null}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-6 min-h-[120px]">
        {resultLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Converting…
          </div>
        )}

        {resultError && !resultLoading && (
          <p className="py-4 text-sm text-error">{resultError}</p>
        )}

        {result && !resultLoading && resultSection && (
          <ResultPanel
            section={resultSection}
            exam={exam}
            year={year!.year}
            chartRows={chartRows}
            chartLoading={chartLoading}
          />
        )}

        {year && canConvert && !result && !resultLoading && !resultError && (
          <p className="py-4 text-sm text-text-subtle">Enter marks to see results.</p>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-text-subtle">
        Historical proxy from official data — not an ESAT score.
      </p>
    </Container>
  );
}

function ResultPanel({
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
  const topPct =
    section.percentile != null
      ? Math.max(0, 100 - section.percentile).toFixed(1)
      : null;

  if (section.scaledScore == null) {
    return (
      <p className="text-sm text-text-muted">No conversion data for this selection.</p>
    );
  }

  return (
    <div className="space-y-5 rounded-organic-lg bg-surface-elevated p-5 sm:p-6 shadow-modal-card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-text-subtle">
            {exam} {year}
            {section.legacyLabel ? ` · ${section.legacyLabel}` : ""}
          </p>
          <p className={cn("mt-1 text-4xl font-bold tabular-nums sm:text-5xl", colorClass)}>
            {section.scaledScore.toFixed(1)}
          </p>
          {section.raw != null && section.maxRaw != null && (
            <p className="mt-0.5 text-xs text-text-muted">
              {section.raw}/{section.maxRaw} correct
            </p>
          )}
        </div>

        {topPct != null && (
          <div className="text-right">
            <p className="text-xs text-text-subtle">Top</p>
            <p className="text-3xl font-bold tabular-nums text-text sm:text-4xl">
              {topPct}%
            </p>
          </div>
        )}
      </div>

      {chartLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading distribution…
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
