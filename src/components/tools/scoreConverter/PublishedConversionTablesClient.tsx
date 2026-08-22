"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  publicCsvPath,
  type PublishedTableRow,
  type SourceKind,
} from "@/lib/scoreConverter/publishedTables.shared";
import {
  CONVERTER_EXAMS,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";

type Props = {
  rows: PublishedTableRow[];
  defaultExam?: ConverterExam | "all";
  converterAnchorId?: string;
};

const SOURCE_BADGE: Record<SourceKind, string> = {
  official: "Official published data",
  foi: "FOI disclosure",
};

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
    <button
      type="button"
      className={cn(
        "rounded-organic-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        "bg-surface-mid text-text hover:bg-surface-subtle",
        className,
      )}
      {...props}
    >
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
    <a
      className={cn(
        "inline-flex items-center rounded-organic-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        "bg-surface-mid text-text hover:bg-surface-subtle",
        className,
      )}
      {...props}
    >
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
            className="rounded-organic-md px-2 py-1 text-sm font-semibold text-text-muted hover:text-text"
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
  converterAnchorId,
  onView,
}: {
  row: PublishedTableRow;
  converterAnchorId: string;
  onView: () => void;
}) {
  const csvHref = `/api/score-converter/published-table?tableId=${row.tableId}&partName=${encodeURIComponent(row.partName)}&format=csv`;
  const staticCsvHref = publicCsvPath(row.csvFilename);

  const apply = () => {
    window.dispatchEvent(
      new CustomEvent("score-converter:apply", {
        detail: {
          exam: row.exam,
          year: row.year,
          paperName: row.paperName,
          partName: row.partName,
        },
      }),
    );
    document.getElementById(converterAnchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton onClick={onView}>View table</ActionButton>
      <ActionLink href={staticCsvHref} download={row.csvFilename}>
        Download CSV
      </ActionLink>
      <ActionLink href={csvHref} download={row.csvFilename} className="sr-only">
        API CSV fallback
      </ActionLink>
      {row.sourceUrl ? (
        <ActionLink href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
          Original source
        </ActionLink>
      ) : null}
      <ActionButton onClick={apply}>Use in converter</ActionButton>
    </div>
  );
}

export function PublishedConversionTablesClient({
  rows,
  defaultExam = "all",
  converterAnchorId = "score-converter",
}: Props) {
  const [exam, setExam] = useState<ConverterExam | "all">(defaultExam);
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [viewRow, setViewRow] = useState<PublishedTableRow | null>(null);

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

  const selectClass =
    "h-10 w-full rounded-organic-lg bg-surface-mid px-3 text-sm font-medium text-text";

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
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Exam
          <select
            className={cn(selectClass, "mt-1.5")}
            value={exam}
            onChange={(event) =>
              setExam(event.target.value as ConverterExam | "all")
            }
          >
            <option value="all">All</option>
            {CONVERTER_EXAMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Year
          <select
            className={cn(selectClass, "mt-1.5")}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="all">All</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Section or paper
          <select
            className={cn(selectClass, "mt-1.5")}
            value={section}
            onChange={(event) => setSection(event.target.value)}
          >
            <option value="all">All</option>
            {sections.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Subject
          <select
            className={cn(selectClass, "mt-1.5")}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="all">All</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2 lg:col-span-1">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter rows…"
            className={cn(selectClass, "mt-1.5")}
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
              <th className="px-4 py-3 font-semibold">Source</th>
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
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-text-muted">
                      {row.sourceKind
                        ? SOURCE_BADGE[row.sourceKind]
                        : "Calculator dataset"}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      ESAT CAMP formatted CSV
                    </p>
                  </div>
                </td>
                <td className="border-t border-white/5 px-4 py-3">
                  <RowActions
                    row={row}
                    converterAnchorId={converterAnchorId}
                    onView={() => setViewRow(row)}
                  />
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-text">
                  {row.exam} · {row.year}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {row.sectionPaper} · {row.subjects}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {row.sourceKind ? SOURCE_BADGE[row.sourceKind] : "Dataset"}
              </span>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              ESAT CAMP formatted CSV
            </p>
            <div className="mt-3">
              <RowActions
                row={row}
                converterAnchorId={converterAnchorId}
                onView={() => setViewRow(row)}
              />
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
