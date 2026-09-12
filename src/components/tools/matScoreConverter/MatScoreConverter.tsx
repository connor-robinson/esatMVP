"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cssVar } from "@/config/colors";
import { Container } from "@/components/layout/Container";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import { MatScoreConverterFaq } from "@/components/tools/matScoreConverter/MatScoreConverterFaq";
import { MatHistoricalTable } from "@/components/tools/matScoreConverter/MatHistoricalTable";
import type { EsatRow } from "@/lib/esat/percentiles";
import {
  convertMatScore,
  listMatYearsNewestFirst,
  percentileMethodLabel,
  round1,
  type MatConvertResult,
} from "@/lib/matScoreConverter";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import { currentGaPath, markConverterResultSeen, trackEvent } from "@/lib/ga";

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-text-muted";

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const selectTriggerClass = cn(
  "flex h-10 w-full items-center justify-between gap-2 rounded-organic-lg px-3.5 text-base font-medium transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-neutral active:scale-[0.99]",
  "disabled:cursor-not-allowed disabled:opacity-45",
  controlBase,
);

const markInputClass = cn(
  "h-9 w-16 rounded-organic-md text-center text-base font-semibold tabular-nums text-text disabled:opacity-35",
  "bg-background dark:bg-white/10",
  controlBase,
);

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
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
        onClick={() => !disabled && setOpen((current) => !current)}
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

      {open && options.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-mid py-1.5 shadow-modal-card"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
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
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-secondary"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function HowItWorksButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        How it works
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-organic-lg bg-surface-elevated p-4 shadow-modal-card"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-text">How we place MAT scores</p>
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
              We use University of Oxford Mathematical Institute feedback for the
              MAT year you choose. Applicant, shortlisted and offer-holder averages
              are official historical benchmarks for that sitting.
            </p>
            <p>
              Percentiles are estimated only when Oxford published a usable score
              distribution. Any TMUA figure is a percentile-equivalent for practice
              context, not an official conversion.
            </p>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
              Learn more
            </p>
            <Link
              href={APP_ROUTES.scoreConverter}
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              ESAT score converter
            </Link>
            <Link
              href={SEO_ROUTES.tmuaForEsat}
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              TMUA for admissions
            </Link>
            <Link
              href="#faq"
              className="block text-xs font-medium text-secondary hover:underline"
              onClick={() => setOpen(false)}
            >
              Full FAQ
            </Link>
          </div>
        </div>
      ) : null}
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
      {warning ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      ) : null}
      {children}
    </div>
  );
}

function formatPercentileTenths(percentile: number): string {
  return `${round1(percentile).toFixed(1)}th`;
}

function formatStat(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return round1(value).toFixed(1);
}

function methodBadgeLabel(result: MatConvertResult): string {
  if (result.percentileApproximate) return "Approximate percentile";
  if (result.percentile == null) return "Official averages";
  return percentileMethodLabel(result.percentileMethod);
}

function calculationSteps(result: MatConvertResult): string[] {
  const steps = [
    `We use Oxford's published MAT data for ${result.year}, from ${result.sourceDocumentTitle}.`,
  ];
  if (result.percentile != null && result.percentileApproximate) {
    steps.push(
      "We estimate where your score sat in that year's candidate distribution using a labelled approximation from Oxford's published statistics. This is not an exact percentile.",
    );
  } else if (result.percentile != null) {
    steps.push(
      "We place your MAT score within Oxford's published score distribution for that year, interpolating within a bin when needed.",
    );
    steps.push("We estimate your historical percentile from that distribution.");
  } else {
    steps.push(
      "Oxford published official applicant / shortlisted / offer averages for this year, but not a tabulated score distribution we can safely turn into a percentile, so no percentile is shown.",
    );
  }
  if (result.tmuaEquivalent != null) {
    steps.push(
      "We find the score at the same percentile on the latest official TMUA distribution.",
    );
    steps.push(
      "MAT and TMUA cover similar mathematical topics and both emphasise problem solving, but they are not identical tests. The TMUA result is a percentile-equivalent, not an official conversion.",
    );
  }
  return steps;
}

function ResultsPreviewPlaceholder() {
  return (
    <div className="relative space-y-5" aria-hidden>
      <div className="flex flex-wrap items-end justify-between gap-4 blur-[2px] opacity-50 saturate-50">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            MAT score
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-text-subtle sm:text-5xl">
            49.6
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-subtle">Percentile</p>
          <p className="text-3xl font-bold tabular-nums text-text-subtle sm:text-4xl">
            –
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
  const minX = 0;
  const maxX = 100;
  const densities = [
    { score: 0, d: 0.4 },
    { score: 20, d: 1.8 },
    { score: 40, d: 5.2 },
    { score: 50, d: 8.4 },
    { score: 70, d: 5.6 },
    { score: 85, d: 2.1 },
    { score: 100, d: 0.5 },
  ];
  const maxY = 10;
  const toX = (x: number) => pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
  const toY = (y: number) => h - pad - (y / maxY) * (h - 2 * pad);
  const linePoints = densities.map((point) => `${toX(point.score)},${toY(point.d)}`).join(" ");
  const areaPoints = [
    `${toX(minX)},${h - pad}`,
    ...densities.map((point) => `${toX(point.score)},${toY(point.d)}`),
    `${toX(maxX)},${h - pad}`,
  ].join(" ");
  const ghostX = toX(49.6);
  const ghostY = toY(8.2);

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
        {[0, 25, 50, 75, 100].map((tick) => (
          <text
            key={tick}
            x={toX(tick)}
            y={h - pad + 14}
            fill={cssVar.textMuted}
            fontSize="9"
            textAnchor="middle"
            opacity={0.6}
          >
            {tick}
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
          fill="var(--color-maths)"
          fillOpacity={0.35}
          stroke={cssVar.background}
          strokeWidth="2"
        />
        <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle" opacity={0.5}>
          MAT score
        </text>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-elevated/30" />
    </div>
  );
}

function ResultsPanel({ result }: { result: MatConvertResult }) {
  const percentileLabel =
    result.percentile != null ? formatPercentileTenths(result.percentile) : null;
  const steps = calculationSteps(result);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            MAT score
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-maths sm:text-5xl">
            {round1(result.score).toFixed(result.score % 1 === 0 ? 0 : 1)}
            <span className="text-2xl font-semibold text-text-muted sm:text-3xl">
              {" "}
              / {result.maxScore}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Oxford MAT {result.year}
          </p>
        </div>
        {percentileLabel ? (
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle/70">
              {result.percentileApproximate
                ? "Approximate percentile"
                : "Estimated historical percentile"}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-text-muted sm:text-3xl">
              {percentileLabel}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle/70">
              Percentile
            </p>
            <p className="text-sm font-medium text-text-muted">Not estimated</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-organic-md bg-surface-mid px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {methodBadgeLabel(result)}
        </span>
        {result.tmuaMatchMethod ? (
          <span className="rounded-organic-md bg-surface-mid px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Percentile match
          </span>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-organic-lg bg-surface-mid px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            All applicants average
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-text">
            {formatStat(result.applicantAverage)}
          </dd>
        </div>
        <div className="rounded-organic-lg bg-surface-mid px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Shortlisted average
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-text">
            {formatStat(result.shortlistedAverage)}
          </dd>
        </div>
        <div className="rounded-organic-lg bg-surface-mid px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Offer-holder average
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-text">
            {formatStat(result.offerAverage)}
          </dd>
        </div>
      </dl>

      {result.tmuaEquivalent != null ? (
        <div className="rounded-organic-lg bg-surface-subtle px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Estimated TMUA percentile-equivalent
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-tmua-accent">
            {round1(result.tmuaEquivalent).toFixed(1)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            MAT and TMUA are different tests. This compares relative cohort
            performance; it is not an official conversion.
          </p>
        </div>
      ) : null}

      {result.chartRows.length > 1 && result.percentile != null ? (
        <PercentileMiniChart
          rows={result.chartRows}
          score={result.score}
          percentile={result.percentile}
          accentColor="var(--color-maths)"
          xLabel="MAT score"
        />
      ) : null}

      {result.formatNote ? <NoteRow>{result.formatNote}</NoteRow> : null}

      {result.percentile == null ? (
        <NoteRow>
          Percentile not estimated: Oxford publishes outcome-by-score charts as
          graphs rather than tabulated bins for this Maths cohort, so we do not
          invent a percentile from averages alone.
        </NoteRow>
      ) : null}

      {result.percentileApproximate ? (
        <NoteRow warning>
          Approximate percentile: this uses a labelled approximation from
          Oxford&apos;s published statistics. It is not an exact historical rank.
        </NoteRow>
      ) : null}

      {result.notes.map((note) => (
        <NoteRow key={note}>{note}</NoteRow>
      ))}

      <details className="group rounded-organic-lg bg-surface-mid/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-text">
          <span>How was this calculated?</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-text-muted">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-[11px] font-semibold tabular-nums text-text">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="px-4 pb-4 text-xs text-text-subtle">
          Source:{" "}
          <a
            href={result.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            {result.sourceDocumentTitle}
          </a>
        </p>
      </details>
    </div>
  );
}

type Props = {
  tmuaRows: EsatRow[];
};

export function MatScoreConverter({ tmuaRows }: Props) {
  const years = useMemo(() => listMatYearsNewestFirst(), []);
  const [year, setYear] = useState<number | null>(null);
  const [scoreDraft, setScoreDraft] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [result, setResult] = useState<MatConvertResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const parsedScore = useMemo(() => {
    if (scoreDraft.trim() === "") return null;
    const value = Number(scoreDraft);
    if (!Number.isFinite(value)) return null;
    return value;
  }, [scoreDraft]);

  const canCalculate = year != null && parsedScore != null;

  const runConvert = () => {
    if (year == null || parsedScore == null) return;
    setResultLoading(true);
    setResultError(null);
    setHasCalculated(true);
    setResult(null);

    const next = convertMatScore({
      year,
      score: parsedScore,
      tmuaRows,
    });

    if (next.error === "unsupported_year") {
      setResultError("That MAT year is not in the verified Oxford dataset.");
      setResult(null);
      setResultLoading(false);
      return;
    }
    if (next.error === "invalid_score") {
      setResultError("Enter a MAT score between 0 and 100.");
      setResult(null);
      setResultLoading(false);
      return;
    }
    if (next.error === "missing_cohort_data") {
      setResultError("Official cohort data is missing for this MAT year.");
      setResult(null);
      setResultLoading(false);
      return;
    }

    setResult(next);
    markConverterResultSeen("MAT");
    trackEvent("score_conversion_completed", {
      converter_type: "mat",
      source_exam: "mat",
      source_year: next.year,
      source_section: "overall",
      conversion_method: next.conversionMethod ?? next.percentileMethod,
      converter_page: currentGaPath() ?? "/tools/score-converter/mat",
    });
    setResultLoading(false);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <Container id="score-converter" size="lg" className="scroll-mt-24 py-8 sm:py-10">
      <div className="mb-4">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-text sm:text-3xl">
            MAT Score Converter
          </h1>
          <HowItWorksButton />
        </div>
        <p className="w-full text-sm font-medium leading-snug tracking-tight text-text-muted sm:text-base">
          Enter an Oxford MAT past-paper score to compare it with historical
          applicants, shortlisted candidates and offer holders, and estimate a
          current TMUA percentile-equivalent where a distribution exists.
        </p>
      </div>

      <div className="mb-4 rounded-organic-xl bg-surface-elevated p-4 shadow-modal-card sm:p-5">
        <div className="relative overflow-visible rounded-organic-lg bg-background/50 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="min-w-[6rem] flex-1">
              <ModernSelect
                label="Year"
                value={year != null ? String(year) : ""}
                minWidth="5rem"
                placeholder="Choose year"
                options={years.map((item) => ({
                  value: String(item.year),
                  label: String(item.year),
                }))}
                onChange={(next) => {
                  setYear(Number(next));
                  setResult(null);
                  setResultError(null);
                  setHasCalculated(false);
                }}
              />
            </div>

            <div className="min-w-[7rem] flex-1">
              <label className="block">
                <span className={fieldLabel}>MAT score</span>
                <div className="flex h-10 items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={scoreDraft}
                    placeholder="0"
                    aria-label="MAT score out of 100"
                    onChange={(event) => {
                      const next = event.target.value.replace(/[^0-9.]/g, "");
                      setScoreDraft(next);
                      setResult(null);
                      setResultError(null);
                      setHasCalculated(false);
                    }}
                    onBlur={() => {
                      if (scoreDraft.trim() === "") return;
                      const value = Number(scoreDraft);
                      if (!Number.isFinite(value)) {
                        setScoreDraft("");
                        return;
                      }
                      const clamped = Math.min(100, Math.max(0, value));
                      setScoreDraft(String(clamped));
                    }}
                    className={markInputClass}
                  />
                  <span className="text-sm font-medium text-text-muted">/100</span>
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={runConvert}
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
        </div>
      </div>

      <div
        ref={resultsRef}
        className="mb-5 min-h-[240px] scroll-mt-24 rounded-organic-xl bg-surface-elevated p-5 shadow-modal-card sm:min-h-[280px] sm:p-6"
      >
        {!hasCalculated && !resultLoading && !resultError ? (
          <ResultsPreviewPlaceholder />
        ) : null}

        {resultLoading ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
            Calculating…
          </div>
        ) : null}

        {resultError && hasCalculated && !resultLoading ? (
          <p className="flex min-h-[160px] items-center justify-center px-4 text-center text-sm text-error">
            {resultError}
          </p>
        ) : null}

        {result && !resultLoading ? <ResultsPanel result={result} /> : null}
      </div>

      <div className="mb-5">
        <MatHistoricalTable />
      </div>

      <MatScoreConverterFaq id="faq" />
    </Container>
  );
}
