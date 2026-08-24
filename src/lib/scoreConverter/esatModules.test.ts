import { describe, expect, it } from "vitest";
import {
  buildSectionOptions,
  type RawSectionPart,
} from "@/lib/scoreConverter/esatModules";
import {
  computeScaledScore,
  resolveConversionPartName,
  scaleScore,
} from "@/lib/papers/markScoring";
import type { ConversionRow } from "@/types/papers";

const HIGH = {
  confidence: "high" as const,
  formatType: "standard_mcq" as const,
  reliabilityNote: null,
};

function part(
  paperName: string,
  partName: string,
  maxRaw: number,
  tableId: number,
): RawSectionPart {
  return { paperName, partName, maxRaw, tableId, ...HIGH };
}

function linearRows(
  partName: string,
  tableId: number,
  maxRaw: number,
  scaledAtMax = 9,
): ConversionRow[] {
  return Array.from({ length: maxRaw + 1 }, (_, raw) => ({
    id: raw,
    tableId,
    partName,
    rawScore: raw,
    scaledScore: raw === maxRaw ? scaledAtMax : 1,
    createdAt: "",
    updatedAt: "",
  }));
}

/** Post-migration fixture shapes mirroring live Supabase layout per year. */
const ENGAA_FIXTURES: Record<
  number,
  { rawParts: RawSectionPart[]; expectedParts: string[]; maxRawByPart: Record<string, number> }
> = {
  2016: {
    rawParts: [
      part("Section 1", "Section 1A", 28, 30),
      part("Section 1", "Section 1B", 26, 30),
    ],
    expectedParts: ["Section 1A", "Section 1B"],
    maxRawByPart: { "Section 1A": 28, "Section 1B": 26 },
  },
  2017: {
    rawParts: [
      part("Section 1", "Section 1A", 28, 31),
      part("Section 1", "Section 1B", 26, 31),
    ],
    expectedParts: ["Section 1A", "Section 1B"],
    maxRawByPart: { "Section 1A": 28, "Section 1B": 26 },
  },
  2018: {
    rawParts: [
      part("Section 1", "Section 1A", 28, 32),
      part("Section 1", "Section 1B", 26, 32),
    ],
    expectedParts: ["Section 1A", "Section 1B"],
    maxRawByPart: { "Section 1A": 28, "Section 1B": 26 },
  },
  2019: {
    rawParts: [
      part("Section 1", "Section 1A", 20, 25),
      part("Section 1", "Section 1B", 20, 25),
      part("Section 2", "Section 1A", 20, 40),
      part("Section 2", "Section 1B", 20, 40),
      part("Section 2", "Section 2", 20, 40),
    ],
    expectedParts: ["Section 1A", "Section 1B", "Section 2"],
    maxRawByPart: { "Section 1A": 20, "Section 1B": 20, "Section 2": 20 },
  },
  2020: {
    rawParts: [
      part("Section 1", "Section 1A", 20, 26),
      part("Section 1", "Section 1B", 20, 26),
      part("Section 2", "Section 1A", 20, 41),
      part("Section 2", "Section 1B", 20, 41),
      part("Section 2", "Section 2", 20, 41),
    ],
    expectedParts: ["Section 1A", "Section 1B", "Section 2"],
    maxRawByPart: { "Section 1A": 20, "Section 1B": 20, "Section 2": 20 },
  },
  2021: {
    rawParts: [
      part("Section 1", "Section 1A", 20, 27),
      part("Section 1", "Section 1B", 20, 27),
      part("Section 2", "Section 1A", 20, 42),
      part("Section 2", "Section 1B", 20, 42),
      part("Section 2", "Section 2", 20, 42),
    ],
    expectedParts: ["Section 1A", "Section 1B", "Section 2"],
    maxRawByPart: { "Section 1A": 20, "Section 1B": 20, "Section 2": 20 },
  },
  2022: {
    rawParts: [
      part("Section 1", "Section 1A", 20, 28),
      part("Section 1", "Section 1B", 20, 28),
      part("Section 2", "Section 1A", 20, 43),
      part("Section 2", "Section 1B", 20, 43),
      part("Section 2", "Section 2", 20, 43),
    ],
    expectedParts: ["Section 1A", "Section 1B", "Section 2"],
    maxRawByPart: { "Section 1A": 20, "Section 1B": 20, "Section 2": 20 },
  },
  2023: {
    rawParts: [
      part("Section 1", "Section 1A", 20, 29),
      part("Section 1", "Section 1B", 20, 29),
      part("Section 1", "Section 2", 20, 29),
    ],
    expectedParts: ["Section 1A", "Section 1B", "Section 2"],
    maxRawByPart: { "Section 1A": 20, "Section 1B": 20, "Section 2": 20 },
  },
};

const ENGAA_2019_1B_S2_IDENTICAL: Array<[number, number]> = [
  [0, 1.0],
  [6, 3.3],
  [10, 5.8],
  [15, 9.0],
  [20, 9.0],
];

const ENGAA_2020_SPOT_CHECKS: Array<{
  partName: string;
  raw: number;
  scaled: number;
}> = [
  { partName: "Section 1A", raw: 10, scaled: 4.9 },
  { partName: "Section 1B", raw: 10, scaled: 8.6 },
  { partName: "Section 2", raw: 10, scaled: 5.7 },
];

function rowsFromPairs(
  partName: string,
  tableId: number,
  pairs: Array<[number, number]>,
): ConversionRow[] {
  return pairs.map(([rawScore, scaledScore], index) => ({
    id: index,
    tableId,
    partName,
    rawScore,
    scaledScore,
    createdAt: "",
    updatedAt: "",
  }));
}

describe("buildSectionOptions ENGAA", () => {
  for (const year of [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]) {
    it(`year ${year} exposes the expected parts without General`, () => {
      const fixture = ENGAA_FIXTURES[year];
      const options = buildSectionOptions("ENGAA", year, fixture.rawParts);
      expect(options.map((o) => o.partName)).toEqual(fixture.expectedParts);
      expect(options.some((o) => o.partName.toLowerCase() === "general")).toBe(
        false,
      );
      for (const option of options) {
        expect(option.maxRaw).toBe(fixture.maxRawByPart[option.partName]);
      }
    });
  }

  it("excludes legacy General rows even when present in raw DB parts", () => {
    const rawParts: RawSectionPart[] = [
      part("Section 1", "General", 20, 25),
      part("Section 2", "Section 1A", 20, 40),
      part("Section 2", "Section 1B", 20, 40),
      part("Section 2", "Section 2", 20, 40),
    ];
    const options = buildSectionOptions("ENGAA", 2019, rawParts);
    expect(options.map((o) => o.partName)).toEqual([
      "Section 1A",
      "Section 1B",
      "Section 2",
    ]);
  });

  it("prefers Section 1 table for Section 1A/1B when both papers carry them", () => {
    const options = buildSectionOptions("ENGAA", 2020, ENGAA_FIXTURES[2020].rawParts);
    const s1a = options.find((o) => o.partName === "Section 1A");
    const s1b = options.find((o) => o.partName === "Section 1B");
    expect(s1a?.paperName).toBe("Section 1");
    expect(s1b?.paperName).toBe("Section 1");
    expect(options.find((o) => o.partName === "Section 2")?.paperName).toBe(
      "Section 2",
    );
  });
});

describe("markScoring ENGAA", () => {
  it("resolves ENGAA Part A/B to Section 1A/1B, not General", () => {
    const rows: ConversionRow[] = [
      ...linearRows("Section 1A", 1, 20),
      ...linearRows("Section 1B", 1, 20),
    ];
    expect(
      resolveConversionPartName("ENGAA", "A", undefined, rows, "Section 1"),
    ).toEqual({ name: "Section 1A", matched: true });
    expect(
      resolveConversionPartName("ENGAA", "B", undefined, rows, "Section 1"),
    ).toEqual({ name: "Section 1B", matched: true });
  });

  it("2019 Section 1B and Section 2 share identical official curves but stay separate parts", () => {
    const rows: ConversionRow[] = [
      ...rowsFromPairs("Section 1B", 1, ENGAA_2019_1B_S2_IDENTICAL),
      ...rowsFromPairs("Section 2", 1, ENGAA_2019_1B_S2_IDENTICAL),
    ];
    for (const [raw, scaled] of ENGAA_2019_1B_S2_IDENTICAL) {
      expect(scaleScore(rows, "Section 1B", raw, "nearest")).toBe(scaled);
      expect(scaleScore(rows, "Section 2", raw, "nearest")).toBe(scaled);
    }
    expect(scaleScore(rows, "Section 1B", 10, "nearest")).toBe(
      scaleScore(rows, "Section 2", 10, "nearest"),
    );
  });

  it("2020 spot-check conversions for all three scoring components", () => {
    const tableId = 41;
    const rows: ConversionRow[] = ENGAA_2020_SPOT_CHECKS.flatMap((check) =>
      rowsFromPairs(check.partName, tableId, [[check.raw, check.scaled]]),
    );
    for (const check of ENGAA_2020_SPOT_CHECKS) {
      expect(scaleScore(rows, check.partName, check.raw, "nearest")).toBe(
        check.scaled,
      );
    }
  });

  it("computeScaledScore does not fall back to General", () => {
    const rows: ConversionRow[] = linearRows("Section 1A", 1, 20);
    const result = computeScaledScore(
      "ENGAA",
      "A",
      10,
      [],
      rows,
      "Section 1",
    );
    expect(result.convPartName).toBe("Section 1A");
    expect(result.matched).toBe(true);
  });
});

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasSupabase)("ENGAA live conversion integration", () => {
  it("2019 Section 1B and Section 2 scaled scores match at representative raw marks", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: papers } = await supabase
      .from("papers")
      .select("id")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", 2019)
      .eq("paper_name", "Section 2");
    const paperId = papers?.[0]?.id;
    expect(paperId).toBeTruthy();

    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id")
      .eq("paper_id", paperId!)
      .limit(1);
    const tableId = tables?.[0]?.id;
    expect(tableId).toBeTruthy();

    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("part_name, raw_score, scaled_score")
      .eq("table_id", tableId!)
      .in("part_name", ["Section 1B", "Section 2"])
      .order("part_name")
      .order("raw_score");

    const byPart = new Map<string, Map<number, number>>();
    for (const row of rows ?? []) {
      if (!byPart.has(row.part_name)) byPart.set(row.part_name, new Map());
      byPart.get(row.part_name)!.set(row.raw_score, Number(row.scaled_score));
    }

    for (const raw of [0, 6, 10, 15, 20]) {
      expect(byPart.get("Section 1B")?.get(raw)).toBe(
        byPart.get("Section 2")?.get(raw),
      );
    }
  });
});
