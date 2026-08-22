"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  publicPdfPath,
  type PublishedTableRow,
} from "@/lib/scoreConverter/publishedTables.shared";
import {
  CONVERTER_EXAMS,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";

type Props = {
  rows: PublishedTableRow[];
  defaultExam?: ConverterExam | "all";
  examFilter?: ConverterExam;
};

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-text-muted";

const selectTriggerClass = cn(
  "flex h-10 w-full items-center justify-between gap-2 rounded-organic-lg px-3.5 text-sm font-medium transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-subtle active:scale-[0.99]",
  controlBase,
);

const actionButtonClass = cn(
  "inline-flex min-h-9 items-center justify-center rounded-organic-lg px-3.5 py-2 text-sm font-semibold transition-all duration-fast",
  "bg-surface-mid text-text hover:bg-surface-subtle active:scale-[0.98]",
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
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[9rem] overflow-hidden rounded-organic-lg bg-surface-subtle py-1.5 shadow-modal-card"
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
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors duration-fast",
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

function ActionButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(actionButtonClass, className)} {...props}>
      {children}
    </button>
  );
}

function ActionLink({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn(actionButtonClass, className)} {...props}>
      {children}
    </a>
  );
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-view-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h3 id="table-view-title" className="text-lg font-bold text-text">
              {row.exam} {row.year} · {row.sectionPaper}
            </h3>
            <p className="mt-1 text-sm text-text-muted">{row.subjects}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-organic-md px-2.5 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text",
              controlBase,
            )}
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-5 pb-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-error">{error}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-text-muted">
                  <th className="pb-2 pr-4 font-semibold">Raw mark</th>
                  <th className="pb-2 font-semibold">Scaled score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.rawMark} className="tabular-nums text-text">
                    <td className="border-t border-white/5 py-2 pr-4">
                      {entry.rawMark}
                    </td>
                    <td className="border-t border-white/5 py-2">
                      {entry.scaledScore.toFixed(1)}
                    </td>
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

function RowActions({
  row,
  onView,
}: {
  row: PublishedTableRow;
  onView: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <ActionButton onClick={onView}>View table</ActionButton>
      <ActionLink href={publicPdfPath(row.pdfFilename)} download>
        Download PDF
      </ActionLink>
    </div>
  );
}

export function PublishedConversionTablesClient({
  rows,
  defaultExam = "all",
  examFilter,
}: Props) {
  const [exam, setExam] = useState<ConverterExam | "all">(
    examFilter ?? defaultExam,
  );
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [viewRow, setViewRow] = useState<PublishedTableRow | null>(null);

  useEffect(() => {
    if (examFilter) setExam(examFilter);
  }, [examFilter]);

  const years = useMemo(
    () =>
      [...new Set(rows.map((row) => String(row.year)))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [rows],
  );
  const sections = useMemo(
    () => [...new Set(rows.map((row) => row.sectionPaper))].sort(),
    [rows],
  );
  const subjects = useMemo(
    () => [...new Set(rows.map((row) => row.subjects))].sort(),
    [rows],
  );

  const filtered = useMemo(
    () => filterRows(rows, exam, year, section, subject, query),
    [rows, exam, year, section, subject, query],
  );

  const examOptions: FilterSelectOption[] = [
    { value: "all", label: "All" },
    ...CONVERTER_EXAMS.map((item) => ({ value: item, label: item })),
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

  return (
    <section className="space-y-5" aria-labelledby="published-tables-heading">
      <div>
        <h2
          id="published-tables-heading"
          className="text-xl font-bold tracking-tight text-text sm:text-2xl"
        >
          Official score conversion tables
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
          View and download the published conversion tables used by this
          calculator. These tables show how raw marks were converted into scaled
          scores for each exam, year and section.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {!examFilter ? (
          <FilterSelect
            label="Exam"
            value={exam}
            onChange={(value) => setExam(value as ConverterExam | "all")}
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
          label="Section or paper"
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
            placeholder="Filter rows…"
            className={cn(selectTriggerClass, "placeholder:text-text-muted")}
          />
        </label>
      </div>

      <div className="hidden overflow-hidden rounded-organic-xl bg-surface-elevated md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Exam</th>
              <th className="px-4 py-3 font-semibold">Year</th>
              <th className="px-4 py-3 font-semibold">Section or paper</th>
              <th className="px-4 py-3 font-semibold">Subjects</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                data-table-id={row.id}
                className="align-top text-text"
              >
                <td className="border-t border-white/5 px-4 py-3 font-semibold">
                  {row.exam}
                </td>
                <td className="border-t border-white/5 px-4 py-3 tabular-nums">
                  {row.year}
                </td>
                <td className="border-t border-white/5 px-4 py-3">
                  {row.sectionPaper}
                </td>
                <td className="border-t border-white/5 px-4 py-3">
                  {row.subjects}
                </td>
                <td className="border-t border-white/5 px-4 py-3">
                  <RowActions row={row} onView={() => setViewRow(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <article
            key={row.id}
            data-table-id={row.id}
            className="rounded-organic-xl bg-surface-elevated p-4"
          >
            <div>
              <p className="text-base font-bold text-text">
                {row.exam} · {row.year}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {row.sectionPaper} · {row.subjects}
              </p>
            </div>
            <div className="mt-3">
              <RowActions row={row} onView={() => setViewRow(row)} />
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">No tables match these filters.</p>
      ) : null}

      <p className="max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
        Conversion tables vary between years because each paper had a different
        difficulty and candidate distribution. Choose the exact year and section
        you completed for the most accurate historical conversion.
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
          href={SEO_ROUTES.preparation}
          className="font-semibold text-secondary hover:underline"
        >
          ESAT preparation guide
        </Link>
        <Link
          href={APP_ROUTES.scoreConverter}
          className="font-semibold text-secondary hover:underline"
        >
          Main score converter
        </Link>
      </div>

      {viewRow ? (
        <TableViewModal row={viewRow} onClose={() => setViewRow(null)} />
      ) : null}
    </section>
  );
}
