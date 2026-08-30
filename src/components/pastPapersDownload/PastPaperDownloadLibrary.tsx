"use client";

import { useMemo, useState } from "react";
import {
  filterDownloads,
  getDownloadYears,
  type DownloadExam,
  type PastPaperDownload,
} from "@/data/pastPapersDownload";
import {
  PastPaperDownloadFilters,
  type DownloadFilterExam,
  type DownloadFilterYear,
} from "./PastPaperDownloadFilters";
import { PastPaperDownloadTable } from "./PastPaperDownloadTable";

type Props = {
  papers: readonly PastPaperDownload[];
  defaultExam?: DownloadFilterExam;
  fixedExam?: DownloadExam;
};

export function PastPaperDownloadLibrary({
  papers,
  defaultExam = "all",
  fixedExam,
}: Props) {
  const [exam, setExam] = useState<DownloadFilterExam>(fixedExam ?? defaultExam);
  const [year, setYear] = useState<DownloadFilterYear>("all");

  const years = useMemo(() => getDownloadYears(papers), [papers]);

  const filtered = useMemo(
    () => filterDownloads(papers, fixedExam ?? exam, year),
    [papers, exam, year, fixedExam],
  );

  return (
    <div className="space-y-4">
      <PastPaperDownloadFilters
        exam={fixedExam ?? exam}
        year={year}
        years={years}
        onExamChange={setExam}
        onYearChange={setYear}
        fixedExam={fixedExam}
      />
      <PastPaperDownloadTable papers={filtered} />
    </div>
  );
}
