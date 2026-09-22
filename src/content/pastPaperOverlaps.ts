/**
 * Section-level ENGAA/NSAA overlap rules shared by the past-papers guide and
 * the condensed teaser on /esat-preparation.
 */

export type OverlapActionKind = "skip" | "unique" | "complete" | "optional";

export type PastPaperOverlapRow = {
  engaa: string;
  relationship: string;
  nsaa: string;
  action: OverlapActionKind;
  support: string;
};

export const PAST_PAPER_OVERLAPS_2016_2019: readonly PastPaperOverlapRow[] = [
  {
    engaa: "ENGAA Section 1 Part A",
    relationship: "Same questions",
    nsaa: "Section 1 Maths and Physics",
    action: "skip",
    support:
      "Skip this if you have completed the same year's NSAA Maths and Physics.",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    relationship: "Mostly overlaps",
    nsaa: "Section 1 Part E",
    action: "unique",
    support: "Complete only the fresh ENGAA questions listed below.",
  },
  {
    engaa: "ENGAA Section 2",
    relationship: "Unique to ENGAA",
    nsaa: "No direct duplicate",
    action: "optional",
    support: "Extra harder Physics practice, but less similar to the ESAT.",
  },
] as const;

export const PAST_PAPER_OVERLAPS_2020_2023: readonly PastPaperOverlapRow[] = [
  {
    engaa: "ENGAA Section 1 Part A",
    relationship: "Same questions",
    nsaa: "Section 1 Maths and Physics",
    action: "skip",
    support: "Skip this if you have completed the same year's NSAA.",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    relationship: "Unique to ENGAA",
    nsaa: "No NSAA Part E",
    action: "complete",
    support: "Do all relevant questions for Maths 2 and extra Physics.",
  },
  {
    engaa: "ENGAA Section 2",
    relationship: "Same Physics set",
    nsaa: "Section 2 Part X",
    action: "skip",
    support: "Complete either the ENGAA or NSAA copy, not both.",
  },
] as const;

/** Short representative rules for the preparation-page teaser. */
export const PAST_PAPER_OVERLAP_TEASERS: readonly {
  rule: string;
  detail: string;
}[] = [
  {
    rule: "ENGAA Section 1 Part A",
    detail:
      "Same Maths/Physics questions as that year's NSAA. Skip if you already completed the NSAA copy.",
  },
  {
    rule: "ENGAA Section 1 Part B, 2020–2023",
    detail: "Unique to ENGAA after NSAA Part E disappeared. Do it for Maths 2.",
  },
  {
    rule: "ENGAA Part B, 2016–2019",
    detail:
      "Mostly overlaps NSAA Part E. Use the unique questions only once the shared set is done.",
  },
  {
    rule: "ENGAA Section 2, 2020–2023",
    detail:
      "Same Physics set as NSAA Section 2 Part X. Complete one copy, not both.",
  },
  {
    rule: "ENGAA Section 2, 2016–2019",
    detail:
      "Unique harder Physics. Optional once closer ESAT-shaped material is finished.",
  },
] as const;
