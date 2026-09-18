"use client";

import { useMemo, useState } from "react";
import type { DownloadExam } from "@/data/pastPapersDownload";
import {
  getEngaaCompactTables,
  getMainPageCompactTables,
  getNsaaCompactTables,
} from "@/data/pastPapersDownload";
import { cn } from "@/lib/utils";
import { PastPaperCompactTable } from "./PastPaperCompactTable";

type Props = {
  exam?: DownloadExam;
  /** When true (default on the combined main inventory), show exam + section pills. */
  withSectionPills?: boolean;
};

type ExamTab = "NSAA" | "ENGAA";
type SectionTab = "Section 1" | "Section 2";

const EXAM_TABS: readonly ExamTab[] = ["NSAA", "ENGAA"];
const SECTION_TABS: readonly SectionTab[] = ["Section 1", "Section 2"];

const TABLE_ID: Record<ExamTab, Record<SectionTab, string>> = {
  NSAA: {
    "Section 1": "nsaa-section-1",
    "Section 2": "nsaa-section-2",
  },
  ENGAA: {
    "Section 1": "engaa-section-1",
    "Section 2": "engaa-section-2",
  },
};

function PillRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
              selected
                ? "bg-white/[0.12] text-white"
                : "bg-transparent text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#CBD5E1]",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function PastPaperDownloadSections({
  exam,
  withSectionPills = !exam,
}: Props) {
  const [examTab, setExamTab] = useState<ExamTab>("NSAA");
  const [sectionTab, setSectionTab] = useState<SectionTab>("Section 1");

  const tables = useMemo(() => {
    if (exam === "NSAA") return getNsaaCompactTables();
    if (exam === "ENGAA") return getEngaaCompactTables();
    return getMainPageCompactTables();
  }, [exam]);

  if (!withSectionPills || exam) {
    if (tables.length === 0) return null;
    return (
      <section className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {tables.map((table) => (
          <PastPaperCompactTable key={table.id} table={table} />
        ))}
      </section>
    );
  }

  const selectedId = TABLE_ID[examTab][sectionTab];
  const selectedTable = tables.find((table) => table.id === selectedId) ?? tables[0];

  if (!selectedTable) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-2.5">
        <PillRow
          label="Exam"
          options={EXAM_TABS}
          value={examTab}
          onChange={setExamTab}
        />
        <PillRow
          label="Section"
          options={SECTION_TABS}
          value={sectionTab}
          onChange={setSectionTab}
        />
      </div>
      <PastPaperCompactTable table={selectedTable} />
    </section>
  );
}
