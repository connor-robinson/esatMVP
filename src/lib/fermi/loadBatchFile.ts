import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  type FermiBatchFile,
  type FermiBatchQuestion,
  normalizeFermiBatch,
} from "@/lib/fermi/batchQuestion";

export type FermiPreviewDay = {
  date: string;
  editionTitle: string | null;
  questions: FermiBatchQuestion[];
};

export type FermiPreviewPayload = {
  meta: FermiBatchFile["meta"];
  dayCount: number;
  questionCount: number;
  days: FermiPreviewDay[];
};

function batchPath(which: "01" | "02"): string {
  return path.join(
    process.cwd(),
    "data",
    which === "01"
      ? "fermi-questions-batch-01.json"
      : "fermi-questions-batch-02.json",
  );
}

export function loadFermiPreviewBatch(
  which: "01" | "02" = "02",
): FermiPreviewPayload | null {
  const full = batchPath(which);
  if (!existsSync(full)) return null;

  const raw = JSON.parse(readFileSync(full, "utf8"));
  const batch = normalizeFermiBatch(raw, {
    batchId: which === "01" ? "batch-01" : "batch-02",
    title: which === "01" ? "Batch 01" : "FermiGuessr month batch",
    startDate: "",
    endDate: "",
  });

  const byDate = new Map<string, FermiBatchQuestion[]>();
  for (const q of batch.questions) {
    const list = byDate.get(q.scheduledDate) ?? [];
    list.push(q);
    byDate.set(q.scheduledDate, list);
  }

  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, questions]) => ({
      date,
      editionTitle:
        questions.find((q) => q.editionTitle)?.editionTitle ?? null,
      questions: [...questions].sort((a, b) => a.id - b.id),
    }));

  return {
    meta: batch.meta,
    dayCount: days.length,
    questionCount: batch.questions.length,
    days,
  };
}
