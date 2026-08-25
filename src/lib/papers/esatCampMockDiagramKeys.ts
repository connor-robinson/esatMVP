/** Diagram-bearing question keys from the Physics mock DOCX. */
export const DIAGRAM_KEYS = [
  "A7",
  "A8",
  "A9",
  "A11",
  "A13",
  "A17",
  "A20",
  "A23",
  "A25",
  "A26",
  "B3",
  "B4",
  "B5",
  "B11",
  "B14",
  "B15",
  "B16",
  "B18",
  "B21",
  "B22",
  "B23",
  "B25",
  "B26",
] as const;

export type EsatCampMockDiagramKey = (typeof DIAGRAM_KEYS)[number];
