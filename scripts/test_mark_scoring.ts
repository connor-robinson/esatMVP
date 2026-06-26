/**
 * Validates mark-page scoring for every NSAA / ENGAA / TMUA paper with a conversion table.
 * Run: npx tsx scripts/test_mark_scoring.ts
 */
import fs from "fs";
import path from "path";
import {
  buildPercentileTableArgs,
  computeScaledScore,
  resolveConversionPartName,
} from "../src/lib/papers/markScoring";
import { mapSectionToTable } from "../src/lib/esat/percentiles";
import { mapPartToSection, mapTmuaPaperNameToSection } from "../src/lib/papers/sectionMapping";
import { scaleScore } from "../src/lib/papers/markScoring";
import type { ConversionRow, Question } from "../src/types/papers";

type PaperRow = {
  id: number;
  exam_name: string;
  exam_year: number;
  paper_name: string;
  exam_type: string;
  has_conversion: boolean;
};

type QuestionRow = {
  part_letter: string | null;
  part_name: string | null;
  paper_name: string | null;
  exam_name: string;
  exam_year: number;
  exam_type: string;
};

function loadEnv(): { url: string; key: string } {
  const envPath = path.join(process.cwd(), ".env.local");
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, v] = trimmed.split("=", 2);
    values[k.trim()] = v.trim();
  }
  const url = process.env.SUPABASE_URL || values.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return { url, key };
}

async function supabaseGet<T>(url: string, key: string, table: string, params: Record<string, string>): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

function groupSections(questions: Question[], examName: string): Record<string, { correct: number; total: number }> {
  const analytics: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    let key: string;
    if (examName === "TMUA") {
      key = mapTmuaPaperNameToSection(q.paperName) ?? "Paper 1";
    } else {
      key = (q.partLetter || "").trim() || "Section";
    }
    if (!analytics[key]) analytics[key] = { correct: 0, total: 0 };
    analytics[key].total++;
    analytics[key].correct++;
  }
  return analytics;
}

async function main() {
  const { url, key } = loadEnv();
  const exams = ["NSAA", "ENGAA", "TMUA"];
  const failures: string[] = [];
  let tested = 0;
  let passed = 0;

  for (const exam of exams) {
    const papers = await supabaseGet<PaperRow>(url, key, "papers", {
      select: "id,exam_name,exam_year,paper_name,exam_type,has_conversion",
      exam_name: `eq.${exam}`,
      order: "exam_year.asc,paper_name.asc",
    });

    for (const paper of papers) {
      const tables = await supabaseGet<{ id: number }>(url, key, "conversion_tables", {
        select: "id",
        paper_id: `eq.${paper.id}`,
      });
      if (tables.length === 0) continue;

      const tableId = tables[0].id;
      const rawRows = await supabaseGet<{
        part_name: string;
        raw_score: number;
        scaled_score: number;
      }>(url, key, "conversion_rows", {
        select: "part_name,raw_score,scaled_score",
        table_id: `eq.${tableId}`,
        order: "part_name.asc,raw_score.asc",
      });

      const conversionRows: ConversionRow[] = rawRows.map((r, i) => ({
        id: i,
        tableId,
        partName: r.part_name,
        rawScore: r.raw_score,
        scaledScore: r.scaled_score,
        createdAt: "",
        updatedAt: "",
      }));

      const qRows = await supabaseGet<QuestionRow>(url, key, "questions", {
        select: "part_letter,part_name,paper_name,exam_name,exam_year,exam_type",
        paper_id: `eq.${paper.id}`,
      });

      if (qRows.length === 0) {
        failures.push(`${exam} ${paper.exam_year} ${paper.paper_name}: no questions`);
        continue;
      }

      const questions: Question[] = qRows.map((q, i) => ({
        id: i,
        paperId: paper.id,
        examName: q.exam_name as Question["examName"],
        examYear: q.exam_year,
        paperName: q.paper_name || paper.paper_name,
        partName: q.part_name || "",
        partLetter: q.part_letter || "",
        examType: q.exam_type as Question["examType"],
        questionNumber: i + 1,
        questionImage: null,
        solutionImage: null,
        solutionText: null,
        solutionType: "none",
        answerLetter: "A",
        createdAt: "",
        updatedAt: "",
      }));

      const sections = groupSections(questions, exam);
      const label = `${exam} ${paper.exam_year} ${paper.paper_name} (${paper.exam_type})`;

      for (const [section, data] of Object.entries(sections)) {
        tested++;
        const match = questions.find((q) =>
          exam === "TMUA"
            ? mapTmuaPaperNameToSection(q.paperName) === section
            : (q.partLetter || "").trim() === section,
        );
        const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
        const resolved = resolveConversionPartName(
          exam,
          partLetterRaw,
          match?.partName,
          conversionRows,
          match?.paperName ?? paper.paper_name,
        );
        const scaled = scaleScore(conversionRows, resolved.name, data.correct, "nearest");
        const { scaled: viaHelper, matched } = computeScaledScore(
          exam,
          section,
          data.correct,
          questions,
          conversionRows,
          paper.paper_name,
        );

        const tableArgs = buildPercentileTableArgs(exam, section, questions);
        const { key: tableKey } = mapSectionToTable(tableArgs);

        const convPartNames = [...new Set(conversionRows.map((r) => r.partName))];
        const okScaled = typeof scaled === "number" && scaled > 0;
        const okMatch = resolved.matched;
        const okTable = exam === "TMUA" ? tableKey === "tmua_paper" : tableKey !== null;
        const okHelper = viaHelper === (typeof scaled === "number" ? Math.round(scaled * 10) / 10 : null);

        if (okScaled && okMatch && okTable && okHelper) {
          passed++;
        } else {
          failures.push(
            `${label} [${section}] conv=${resolved.name} matched=${okMatch} scaled=${scaled} table=${tableKey} parts=[${convPartNames.join(", ")}] map=${JSON.stringify(tableArgs)}`,
          );
        }
      }
    }
  }

  console.log(`\nMark scoring validation: ${passed}/${tested} passed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(" -", f);
    process.exit(1);
  }
  console.log("All conversion + ESAT/TMUA table mappings OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
