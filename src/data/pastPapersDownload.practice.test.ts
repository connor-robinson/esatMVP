import { describe, expect, it } from "vitest";
import {
  getEngaaCompactTables,
  getMainPageCompactTables,
  getNsaaCompactTables,
} from "./pastPapersDownload";

describe("past paper compact tables", () => {
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
