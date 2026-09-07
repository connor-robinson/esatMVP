import { describe, expect, it } from "vitest";
import {
  getEngaaCompactTables,
  getMainPageCompactTables,
  getNsaaCompactTables,
} from "./pastPapersDownload";

describe("past paper compact tables", () => {
  it("names the combined-page tables without extra decoration", () => {
    expect(getMainPageCompactTables().map((table) => table.heading)).toEqual([
      "NSAA Section 1 2016–2023",
      "NSAA Section 2 2016–2023",
      "ENGAA Section 1 2016–2023",
      "ENGAA Section 2 2016–2023",
    ]);
  });

  it("lists 2016–2023 plus specimens on every combined-page table", () => {
    const years = ["2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016"];
    for (const table of getMainPageCompactTables()) {
      const labels = table.rows.map((row) => row.label);
      expect(labels.slice(0, years.length), table.id).toEqual(years);
      expect(
        labels.some((label) => label.startsWith("Specimen")),
        table.id,
      ).toBe(true);
    }
  });

  it("gives every paper and specimen row a start-in-camp link", () => {
    const tables = [
      ...getMainPageCompactTables(),
      ...getNsaaCompactTables(),
      ...getEngaaCompactTables(),
    ];

    for (const table of tables) {
      if (table.columns === "specification") {
        expect(table.rows.every((row) => !row.practiceHref)).toBe(true);
        continue;
      }

      for (const row of table.rows) {
        expect(row.practiceHref, `${table.id} ${row.label}`).toMatch(
          /^\/past-papers\/solve\/start\?exam=(nsaa|engaa)&/,
        );
      }
    }
  });
});
