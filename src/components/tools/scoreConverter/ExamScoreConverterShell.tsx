"use client";

import { useCallback, useEffect, useState } from "react";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";
import { isConverterExam, type ConverterExam } from "@/lib/scoreConverter/esatModules";
import type { PublishedTableRow } from "@/lib/scoreConverter/publishedTables.shared";
import { SCORE_CONVERTER_PAGE_COPY } from "@/lib/scoreConverter/scoreConverterPageCopy";

type Props = {
  initialExam: ConverterExam;
  /** Server-preloaded catalog so crawlers do not depend on /api/. */
  publishedRows: PublishedTableRow[];
};

function examFromPathname(): ConverterExam | null {
  if (typeof window === "undefined") return null;
  const segment = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
  if (!isConverterExam(segment)) return null;
  return segment.toUpperCase() as ConverterExam;
}

export function ExamScoreConverterShell({
  initialExam,
  publishedRows,
}: Props) {
  const [exam, setExam] = useState<ConverterExam>(initialExam);

  useEffect(() => {
    setExam(initialExam);
  }, [initialExam]);

  useEffect(() => {
    const onPopState = () => {
      const fromPath = examFromPathname();
      if (fromPath) setExam(fromPath);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleExamChange = useCallback((next: ConverterExam) => {
    setExam(next);
  }, []);

  return (
    <ScoreConverter
      initialExam={exam}
      onExamChange={handleExamChange}
      intro={SCORE_CONVERTER_PAGE_COPY[exam].intro}
      beforeFaq={
        <PublishedConversionTablesClient
          rows={publishedRows}
          examFilter={exam === "TMUA" ? undefined : exam}
          defaultExam={exam === "TMUA" ? "all" : exam}
          defaultOpen
        />
      }
    />
  );
}
