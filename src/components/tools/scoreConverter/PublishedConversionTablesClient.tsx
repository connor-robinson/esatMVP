"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  publicPdfPath,
  type PublishedTableRow,
} from "@/lib/scoreConverter/publishedTables.shared";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";

type Props = {
  /** Preloaded rows (optional). When omitted, catalog loads on first expand. */
  rows?: PublishedTableRow[];
  defaultExam?: ConverterExam | "all";
  examFilter?: ConverterExam;
  /** Start collapsed. Default true so the page does not open every table. */
  defaultOpen?: boolean;
};

const PUBLISHED_EXAMS: ConverterExam[] = ["NSAA", "ENGAA"];

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const fieldLabel =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted";

const selectTriggerClass = cn(
  "flex h-9 w-full items-center justify-between gap-2 rounded-organic-lg px-3 text-sm font-medium transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-subtle active:scale-[0.99]",
  controlBase,
);

type FilterSelectOption = { value: string; label: string };

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

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
    <div ref={rootRef} className="relative">
      <span className={fieldLabel}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
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

      {open && options.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-subtle py-1 shadow-modal-card"
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
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-fast",
                    isSelected
                      ? "bg-surface-mid font-semibold text-text"
                      : "text-text-muted hover:bg-surface-mid/80 hover:text-text",
                    controlBase,
                  )}
                >
                  <span className="truncate">{option.label}</span>
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
    </div>
  );
}

function filterRows(
  rows: PublishedTableRow[],
  exam: ConverterExam | "all",
  year: string,
  section: string,
  subject: string,
  query: string,
): PublishedTableRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (row.exam === "TMUA") return false;
    if (exam !== "all" && row.exam !== exam) return false;
    if (year !== "all" && String(row.year) !== year) return false;
    if (section !== "all" && row.sectionPaper !== section) return false;
    if (subject !== "all" && row.subjects !== subject) return false;
    if (!q) return true;
    const haystack = [
      row.exam,
      String(row.year),
      row.sectionPaper,
      row.subjects,
      row.partName,
      row.paperName,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function TableViewModal({
  row,
  onClose,
}: {
  row: PublishedTableRow;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<
    Array<{ rawMark: number; scaledScore: number }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/score-converter/published-table?tableId=${row.tableId}&partName=${encodeURIComponent(row.partName)}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load table");
        const data = await res.json();
        if (!cancelled) setEntries(data.rows ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load table");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.tableId, row.partName]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-view-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h3 id="table-view-title" className="text-base font-bold text-text">
              {row.exam} {row.year}
            </h3>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {row.sectionPaper} · {row.subjects}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-organic-md px-2.5 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
              controlBase,
            )}
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-5 pb-5">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-error">{error}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-elevated">
                <tr className="text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="pb-2 pr-4 font-semibold">Raw</th>
                  <th className="pb-2 font-semibold">Scaled</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.rawMark} className="tabular-nums text-text">
                    <td className="py-1.5 pr-4">{entry.rawMark}</td>
                    <td className="py-1.5">{entry.scaledScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function YearGroup({
  year,
  rows,
  open,
  onToggle,
  onView,
}: {
  year: number;
  rows: PublishedTableRow[];
  open: boolean;
  onToggle: () => void;
  onView: (row: PublishedTableRow) => void;
}) {
  const panelId = useId();
  const exams = [...new Set(rows.map((r) => r.exam))].join(" · ");

  return (
    <div className="rounded-organic-xl bg-surface-elevated">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-mid/40 sm:px-5",
          controlBase,
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold tabular-nums text-text sm:text-base">
            {year}
          </p>
          <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
            {rows.length} table{rows.length === 1 ? "" : "s"}
            {exams ? ` · ${exams}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-subtle transition-transform duration-fast",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="px-2 pb-3 sm:px-3">
          <ul className="space-y-1">
            {rows.map((row) => (
              <li
                key={row.id}
                data-table-id={row.id}
                className="flex flex-col gap-2 rounded-organic-lg px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    <span className="text-text-muted">{row.exam}</span>
                    <span className="text-text-subtle"> · </span>
                    {row.sectionPaper}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted sm:text-sm">
                    {row.subjects}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onView(row)}
                    className={cn(
                      "rounded-organic-md px-3 py-1.5 text-sm font-semibold text-secondary transition-colors hover:bg-surface-mid",
                      controlBase,
                    )}
                  >
                    View
                  </button>
                  <a
                    href={publicPdfPath(row.pdfFilename)}
                    download
                    className={cn(
                      "rounded-organic-md px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
                      controlBase,
                    )}
                  >
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PublishedConversionTablesClient({
  rows: initialRows,
  defaultExam = "all",
  examFilter,
  defaultOpen = false,
}: Props) {
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);
  const [rows, setRows] = useState<PublishedTableRow[]>(initialRows ?? []);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(Boolean(initialRows));
  const [exam, setExam] = useState<ConverterExam | "all">(
    examFilter && examFilter !== "TMUA" ? examFilter : defaultExam === "TMUA" ? "all" : defaultExam,
  );
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [viewRow, setViewRow] = useState<PublishedTableRow | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (examFilter && examFilter !== "TMUA") setExam(examFilter);
  }, [examFilter]);

  useEffect(() => {
    if (initialRows) {
      setRows(initialRows.filter((row) => row.exam !== "TMUA"));
      setLoaded(true);
    }
  }, [initialRows]);

  useEffect(() => {
    if (!sectionOpen || loaded) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);

    const params = new URLSearchParams();
    if (examFilter && examFilter !== "TMUA") {
      params.set("exam", examFilter);
    }

    fetch(`/api/score-converter/published-catalog?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load conversion tables");
        const data = await res.json();
        if (cancelled) return;
        setRows(
          ((data.rows ?? []) as PublishedTableRow[]).filter(
            (row) => row.exam !== "TMUA",
          ),
        );
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : "Failed to load tables",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sectionOpen, loaded, examFilter]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.exam !== "TMUA"),
    [rows],
  );

  const years = useMemo(
    () =>
      [...new Set(visibleRows.map((row) => String(row.year)))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [visibleRows],
  );
  const sections = useMemo(
    () => [...new Set(visibleRows.map((row) => row.sectionPaper))].sort(),
    [visibleRows],
  );
  const subjects = useMemo(
    () => [...new Set(visibleRows.map((row) => row.subjects))].sort(),
    [visibleRows],
  );

  const filtered = useMemo(
    () => filterRows(visibleRows, exam, year, section, subject, query),
    [visibleRows, exam, year, section, subject, query],
  );

  const groupedByYear = useMemo(() => {
    const map = new Map<number, PublishedTableRow[]>();
    for (const row of filtered) {
      const list = map.get(row.year) ?? [];
      list.push(row);
      map.set(row.year, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const examOptions: FilterSelectOption[] = [
    { value: "all", label: "All" },
    ...PUBLISHED_EXAMS.map((item) => ({ value: item, label: item })),
  ];
  const yearOptions: FilterSelectOption[] = [
    { value: "all", label: "All" },
    ...years.map((item) => ({ value: item, label: item })),
  ];
  const sectionOptions: FilterSelectOption[] = [
    { value: "all", label: "All" },
    ...sections.map((item) => ({ value: item, label: item })),
  ];
  const subjectOptions: FilterSelectOption[] = [
    { value: "all", label: "All" },
    ...subjects.map((item) => ({ value: item, label: item })),
  ];

  const toggleYear = (y: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  };

  return (
    <section aria-labelledby="published-tables-heading">
      <button
        type="button"
        aria-expanded={sectionOpen}
        onClick={() => setSectionOpen((v) => !v)}
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-organic-xl bg-surface-elevated px-5 py-4 text-left transition-colors hover:bg-surface-mid/50 sm:px-6 sm:py-5",
          controlBase,
        )}
      >
        <div className="min-w-0">
          <h2
            id="published-tables-heading"
            className="text-lg font-bold tracking-tight text-text sm:text-xl"
          >
            Official score conversion tables
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
            Published NSAA and ENGAA raw-to-scaled tables used by this
            calculator.
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-text-subtle transition-transform duration-fast",
            sectionOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {sectionOpen ? (
        <div className="mt-4 space-y-4">
          {catalogLoading ? (
            <p className="flex items-center gap-2 px-1 py-6 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading tables…
            </p>
          ) : catalogError ? (
            <p className="px-1 py-4 text-sm text-error">{catalogError}</p>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-3",
                  examFilter
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : "sm:grid-cols-2 lg:grid-cols-5",
                )}
              >
                {!examFilter ? (
                  <FilterSelect
                    label="Exam"
                    value={exam}
                    onChange={(value) =>
                      setExam(value as ConverterExam | "all")
                    }
                    options={examOptions}
                  />
                ) : null}
                <FilterSelect
                  label="Year"
                  value={year}
                  onChange={setYear}
                  options={yearOptions}
                />
                <FilterSelect
                  label="Section"
                  value={section}
                  onChange={setSection}
                  options={sectionOptions}
                />
                <FilterSelect
                  label="Subject"
                  value={subject}
                  onChange={setSubject}
                  options={subjectOptions}
                />
                <label className="block sm:col-span-2 lg:col-span-1">
                  <span className={fieldLabel}>Search</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter…"
                    className={cn(
                      selectTriggerClass,
                      "placeholder:text-text-muted",
                    )}
                  />
                </label>
              </div>

              {groupedByYear.length === 0 ? (
                <p className="px-1 text-sm text-text-muted">
                  No tables match these filters.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedByYear.map(([y, yearRows]) => (
                    <YearGroup
                      key={y}
                      year={y}
                      rows={yearRows}
                      open={openYears.has(y)}
                      onToggle={() => toggleYear(y)}
                      onView={setViewRow}
                    />
                  ))}
                </div>
              )}

              <p className="max-w-3xl px-1 text-sm leading-relaxed text-text-muted">
                Pick the exact year and section you sat. Difficulty and cohort
                changed between sittings, so the matching table matters.
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm">
                <Link
                  href={SEO_ROUTES.goodScore}
                  className="font-semibold text-secondary hover:underline"
                >
                  What is a good ESAT score?
                </Link>
                <Link
                  href={SEO_ROUTES.pastPapers}
                  className="font-semibold text-secondary hover:underline"
                >
                  ESAT past papers
                </Link>
                <Link
                  href={APP_ROUTES.scoreConverter}
                  className="font-semibold text-secondary hover:underline"
                >
                  Main score converter
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      {viewRow ? (
        <TableViewModal row={viewRow} onClose={() => setViewRow(null)} />
      ) : null}
    </section>
  );
}
