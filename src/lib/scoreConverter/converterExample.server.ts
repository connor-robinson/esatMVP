import { createServerClient } from "@/lib/supabase/server";
import { fetchConversionRowsForTables } from "@/lib/scoreConverter/fetchConversionRows.server";
import {
  buildSectionOptions,
  isTmuaOverallPart,
  isTmuaPaper1Part,
  isTmuaPaper2Part,
  TMUA_IRT_FROM_YEAR,
  type Confidence,
  type ConverterExam,
  type FormatType,
  type RawSectionPart,
  type SectionOption,
} from "@/lib/scoreConverter/esatModules";

const TARGET_SCALED = 4.1;

const NSAA_EXAMPLE_RAW_BY_MODULE: Record<string, number> = {
  "Mathematics 1": 18,
  Physics: 10,
  Chemistry: 8,
};

export type ConverterExampleSelection = {
  key: string;
  paperName: string;
  partName: string;
  raw: number;
};

export type ConverterExampleResponse = {
  exam: ConverterExam;
  year: number;
  mode: "raw" | "scaled";
  selectedGroup: string;
  selections: ConverterExampleSelection[];
  tmuaPickMode?: "split" | "overall";
  scaledScore?: number;
};

type DbPaper = { id: number; paper_name: string };
type DbTable = {
  id: number;
  paper_id: number;
  confidence: Confidence;
  format_type: FormatType;
  reliability_note: string | null;
};

type DbConvRow = {
  table_id: number;
  part_name: string;
  raw_score: number;
  scaled_score: number;
};

async function loadSectionOptions(
  exam: ConverterExam,
  year: number,
): Promise<SectionOption[]> {
  const supabase = createServerClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, paper_name")
    .eq("exam_name", exam)
    .eq("exam_year", year)
    .eq("has_conversion", true);

  const paperRows = (papers ?? []) as DbPaper[];
  if (paperRows.length === 0) return [];

  const paperNameById = new Map(paperRows.map((p) => [p.id, p.paper_name]));
  const paperIds = paperRows.map((p) => p.id);

  const { data: tables } = await supabase
    .from("conversion_tables")
    .select("id, paper_id, format_type, confidence, reliability_note")
    .in("paper_id", paperIds);

  const tableRows = (tables ?? []) as DbTable[];
  if (tableRows.length === 0) return [];

  const tableMeta = new Map(tableRows.map((t) => [t.id, t]));
  const tableIds = tableRows.map((t) => t.id);
  const convRows = (await fetchConversionRowsForTables(
    supabase,
    tableIds,
  )) as DbConvRow[];

  const maxByKey = new Map<string, number>();
  for (const row of convRows) {
    const key = `${row.table_id}::${row.part_name}`;
    maxByKey.set(key, Math.max(maxByKey.get(key) ?? 0, row.raw_score));
  }

  const rawParts: RawSectionPart[] = [];
  for (const [key, maxRaw] of maxByKey) {
    const [tableIdStr, partName] = key.split("::");
    const tableId = Number(tableIdStr);
    const meta = tableMeta.get(tableId);
    if (!meta) continue;
    rawParts.push({
      paperName: paperNameById.get(meta.paper_id) ?? "",
      partName,
      maxRaw,
      tableId,
      confidence: meta.confidence,
      formatType: meta.format_type,
      reliabilityNote: meta.reliability_note,
    });
  }

  return buildSectionOptions(exam, year, rawParts);
}

function rowsForOption(
  convRows: DbConvRow[],
  option: SectionOption,
): DbConvRow[] {
  return convRows
    .filter(
      (row) =>
        row.table_id === option.tableId && row.part_name === option.partName,
    )
    .sort((a, b) => a.raw_score - b.raw_score);
}

function rawMarkNearTarget(rows: DbConvRow[], target = TARGET_SCALED): number {
  if (rows.length === 0) return 0;
  let best = rows[0]!.raw_score;
  let bestDiff = Infinity;
  for (const row of rows) {
    const diff = Math.abs(Number(row.scaled_score) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row.raw_score;
    }
  }
  return best;
}

async function latestRawYear(exam: ConverterExam): Promise<number | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("papers")
    .select("exam_year")
    .eq("exam_name", exam)
    .eq("has_conversion", true)
    .order("exam_year", { ascending: false })
    .limit(1);

  const year = (data?.[0] as { exam_year: number } | undefined)?.exam_year;
  return year ?? null;
}

function groupSections(options: SectionOption[]): Map<string, SectionOption[]> {
  const map = new Map<string, SectionOption[]>();
  for (const option of options) {
    const list = map.get(option.group) ?? [];
    list.push(option);
    map.set(option.group, list);
  }
  return map;
}

async function buildRawExample(
  exam: ConverterExam,
  year: number,
  pickOptions: (groups: Map<string, SectionOption[]>, options: SectionOption[]) => {
    selectedGroup: string;
    picked: SectionOption[];
  },
  rawByModuleLabel?: Record<string, number>,
): Promise<ConverterExampleResponse | null> {
  const options = await loadSectionOptions(exam, year);
  if (options.length === 0) return null;

  const groups = groupSections(options);
  const { selectedGroup, picked } = pickOptions(groups, options);
  if (picked.length === 0) return null;

  const supabase = createServerClient();
  const tableIds = [...new Set(picked.map((option) => option.tableId))];
  const convRows = (await fetchConversionRowsForTables(
    supabase,
    tableIds,
  )) as DbConvRow[];

  const selections: ConverterExampleSelection[] = picked.map((option) => {
    const presetRaw =
      option.moduleLabel != null
        ? rawByModuleLabel?.[option.moduleLabel]
        : undefined;
    return {
      key: option.key,
      paperName: option.paperName,
      partName: option.partName,
      raw: presetRaw ?? rawMarkNearTarget(rowsForOption(convRows, option)),
    };
  });

  return {
    exam,
    year,
    mode: "raw",
    selectedGroup,
    selections,
  };
}

/** Build a first-visit example from live conversion tables (no hardcoded scores). */
export async function buildConverterExample(
  exam: ConverterExam,
): Promise<ConverterExampleResponse | null> {
  if (exam === "TMUA") {
    const year = await latestRawYear("TMUA");
    if (!year || year >= TMUA_IRT_FROM_YEAR) return null;

    const options = await loadSectionOptions("TMUA", year);
    const paper1 = options.find((option) => isTmuaPaper1Part(option.partName));
    const paper2 = options.find((option) => isTmuaPaper2Part(option.partName));
    if (!paper1 || !paper2) return null;

    const supabase = createServerClient();
    const tableIds = [...new Set([paper1.tableId, paper2.tableId])];
    const convRows = (await fetchConversionRowsForTables(
      supabase,
      tableIds,
    )) as DbConvRow[];

    return {
      exam: "TMUA",
      year,
      mode: "raw",
      selectedGroup: paper1.group,
      tmuaPickMode: "split",
      selections: [paper1, paper2].map((option) => ({
        key: option.key,
        paperName: option.paperName,
        partName: option.partName,
        raw: rawMarkNearTarget(rowsForOption(convRows, option)),
      })),
    };
  }

  if (exam === "ENGAA") {
    const year = await latestRawYear("ENGAA");
    if (!year) return null;

    return buildRawExample("ENGAA", year, (groups) => {
      const section1 = groups.get("Section 1");
      const picked =
        section1 && section1.length > 0
          ? section1
          : [...(groups.values().next().value ?? [])];
      return {
        selectedGroup: section1?.length ? "Section 1" : (picked[0]?.group ?? ""),
        picked: [...picked],
      };
    });
  }

  const year = await latestRawYear("NSAA");
  if (!year) return null;

  return buildRawExample("NSAA", year, (groups) => {
    const section1 = groups.get("Section 1") ?? [...groups.values()][0] ?? [];
    const picked = ["Mathematics 1", "Physics", "Chemistry"]
      .map((moduleLabel) =>
        section1.find((option) => option.moduleLabel === moduleLabel),
      )
      .filter((option): option is SectionOption => option != null);
    return {
      selectedGroup: section1[0]?.group ?? "Section 1",
      picked,
    };
  }, NSAA_EXAMPLE_RAW_BY_MODULE);
}

export function scaledScoreNearTarget(
  rows: Array<{ score: number; cumulativePct: number }>,
  target = TARGET_SCALED,
): number | null {
  if (rows.length === 0) return null;
  let best = rows[0]!.score;
  let bestDiff = Infinity;
  for (const row of rows) {
    const diff = Math.abs(row.score - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row.score;
    }
  }
  return best;
}
