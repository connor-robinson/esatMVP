import type { FaqItem } from "@/lib/seo/config";

export const PAST_PAPERS_GUIDE_LAST_REVIEWED = {
  label: "20 August 2026",
  iso: "2026-08-20",
} as const;

export type GuideModuleId =
  | "maths1"
  | "maths2"
  | "physics"
  | "chemistry"
  | "biology";

export type GuideProgressId =
  | "nothing"
  | "esat_samples"
  | "nsaa_s1"
  | "engaa_s1"
  | "nsaa_s2";

export const GUIDE_MODULES: readonly {
  id: GuideModuleId;
  label: string;
  shortLabel: string;
}[] = [
  { id: "maths1", label: "Mathematics 1", shortLabel: "Maths 1" },
  { id: "maths2", label: "Mathematics 2", shortLabel: "Maths 2" },
  { id: "physics", label: "Physics", shortLabel: "Physics" },
  { id: "chemistry", label: "Chemistry", shortLabel: "Chem" },
  { id: "biology", label: "Biology", shortLabel: "Bio" },
] as const;

/** ESAT candidates sit at most three modules. */
export const MAX_GUIDE_MODULES = 3;

export const GUIDE_PROGRESS_OPTIONS: readonly {
  id: GuideProgressId;
  label: string;
}[] = [
  { id: "nothing", label: "Nothing yet" },
  { id: "esat_samples", label: "Official ESAT samples" },
  { id: "nsaa_s1", label: "NSAA Section 1" },
  { id: "engaa_s1", label: "ENGAA Section 1" },
  { id: "nsaa_s2", label: "NSAA Section 2" },
] as const;

export const DEFAULT_GUIDE_MODULES: readonly GuideModuleId[] = [
  "maths1",
  "maths2",
  "physics",
];

/** Exact unique ENGAA Section 1 Part B question numbers, by year (2016–2019). */
export const UNIQUE_ENGAA_PART_B_BY_YEAR: Readonly<
  Record<number, readonly number[]>
> = {
  2016: [32, 42, 47, 49, 52, 53, 54],
  2017: [32, 35, 36, 37, 41, 50, 51, 54],
  2018: [35, 38, 39, 42, 45, 50, 51, 52],
  2019: [25, 38],
};

export const SHORT_ANSWER_CARD = {
  title: "If you only remember one thing",
  rows: [
    { module: "Mathematics 1", route: "NSAA Section 1 Part A" },
    {
      module: "Physics",
      route: "NSAA Section 1 Part B, then ENGAA Part B and selected Section 2",
    },
    {
      module: "Chemistry",
      route: "NSAA Section 1 Part C, then NSAA Section 2 Part Y",
    },
    {
      module: "Biology",
      route: "NSAA Section 1 Part D, then NSAA Section 2 Part Z",
    },
    {
      module: "Mathematics 2",
      route: "ENGAA Section 1 Part B, then TMUA Paper 1",
    },
  ],
} as const;

export const OVERLAP_RULES_2016_2019 = [
  {
    engaa: "ENGAA Section 1 Part A",
    nsaa: "NSAA Section 1 Parts A and B",
    action: "COMPLETE OVERLAP",
    instruction: "SKIP AFTER NSAA",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    nsaa: "NSAA Section 1 Part E",
    action: "MOSTLY OVERLAP",
    instruction: "DO UNIQUE QUESTIONS",
  },
  {
    engaa: "ENGAA Section 2",
    nsaa: "Unique relative to NSAA",
    action: "UNIQUE",
    instruction: "OPTIONAL HARDER PHYSICS",
  },
] as const;

export const OVERLAP_RULES_2020_2023 = [
  {
    engaa: "ENGAA Section 1 Part A",
    nsaa: "NSAA Section 1 Parts A and B",
    action: "COMPLETE OVERLAP",
    instruction: "SKIP AFTER NSAA",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    nsaa: "Fresh relative to NSAA Section 1",
    action: "FRESH MATERIAL",
    instruction: "DO ALL RELEVANT QUESTIONS",
  },
  {
    engaa: "ENGAA Section 2",
    nsaa: "NSAA Section 2 Part X Physics",
    action: "COMPLETE OVERLAP",
    instruction: "USE ONCE",
  },
] as const;

export type TierId = "S" | "A" | "B" | "C";

export type TierExam = "NSAA" | "ENGAA" | "TMUA" | "ESAT" | "OTHERS";

export type TierItem = {
  id: string;
  years: string;
  exam: TierExam;
  section: string;
  /** Short label shown on hover (matches the handwritten notes on the reference). */
  note?: string;
  description: string;
  /** Dimmed charcoal cards used for duplicate / skip material. */
  muted?: boolean;
  /** Extra papers grouped under an OTHERS card. */
  related?: readonly string[];
};

export const TIER_LIST: readonly {
  tier: TierId;
  title: string;
  items: readonly TierItem[];
}[] = [
  {
    tier: "S",
    title: "Highest priority",
    items: [
      {
        id: "nsaa-s1",
        years: "2016–2023",
        exam: "NSAA",
        section: "Section 1",
        note: "relevant parts only",
        description:
          "Best large source for Mathematics 1, Physics, Chemistry and Biology. Use the parts that match your modules.",
      },
      {
        id: "engaa-s1b-2020",
        years: "2020–2023",
        exam: "ENGAA",
        section: "Section 1 Part B",
        note: "maths 2 & Physics",
        description:
          "Fresh Mathematics 2 and Physics practice after NSAA Part E disappeared.",
      },
      {
        id: "tmua-p1",
        years: "2016–2023",
        exam: "TMUA",
        section: "Paper 1",
        note: "Maths 2",
        description:
          "Strong extra Mathematics 2 problem solving, but the questions are longer.",
      },
    ],
  },
  {
    tier: "A",
    title: "Useful after the closest material",
    items: [
      {
        id: "nsaa-s2-2020",
        years: "2020–2023",
        exam: "NSAA",
        section: "Section 2",
        note: "harder and less similar",
        description:
          "Harder science multiple choice. Relevant parts only; skip out-of-spec content.",
      },
      {
        id: "engaa-s2-2016",
        years: "2016–2019",
        exam: "ENGAA",
        section: "Section 2",
        note: "harder and less similar",
        description:
          "Unique harder Physics, but less similar to ESAT and sometimes calculator-based.",
      },
      {
        id: "engaa-s1b-2016",
        years: "2016–2019",
        exam: "ENGAA",
        section: "Section 1 Part B",
        note: "harder and less similar",
        description:
          "Useful advanced Mathematics and Physics once the NSAA Part E duplicates are removed.",
      },
    ],
  },
  {
    tier: "B",
    title: "Supplementary or format-only",
    items: [
      {
        id: "nsaa-s2-2016",
        years: "2016–2019",
        exam: "NSAA",
        section: "Section 2",
        note: "written qs",
        description:
          "Longer written, calculator-allowed science problems. Interesting, but not ESAT-shaped.",
      },
      {
        id: "tmua-p2",
        years: "2016–2023",
        exam: "TMUA",
        section: "Paper 2",
        note: "logic / reasoning",
        description:
          "More logic and mathematical reasoning than ESAT-style Mathematics 2.",
      },
      {
        id: "esat-samples",
        years: "2024",
        exam: "ESAT",
        section: "Specimen",
        note: "easier qs",
        description:
          "Do these first for format and interface. Do not treat one score as a forecast of your live result.",
      },
      {
        id: "others",
        years: "All years",
        exam: "OTHERS",
        section: "extra papers",
        note: "easier qs",
        related: ["PAT", "BMAT", "BPHO SPC", "CAIE", "UKMT SMC"],
        description:
          "Useful for extra maths and physics practice once the closer ESAT-shaped papers are used up. Style and difficulty vary a lot.",
      },
    ],
  },
  {
    tier: "C",
    title: "Duplicates after NSAA",
    items: [
      {
        id: "engaa-s1a",
        years: "2016–2023",
        exam: "ENGAA",
        section: "Section 1 Part A",
        note: "duplicates",
        description:
          "Skip if you have completed the same year's NSAA Mathematics and Physics.",
        muted: true,
      },
      {
        id: "engaa-s2-2020",
        years: "2020–2023",
        exam: "ENGAA",
        section: "Section 2",
        note: "duplicates",
        description:
          "Skip if you have completed the same year's NSAA Section 2 Part X Physics.",
        muted: true,
      },
    ],
  },
] as const;

export const PAST_PAPERS_GUIDE_FAQ: readonly FaqItem[] = [
  {
    question: "Are there real ESAT past papers?",
    answer:
      "No live ESAT papers have been publicly released. UAT-UK provides official specimen and practice tests, plus marked-up NSAA and ENGAA Section 1 papers from 2016–2023.",
  },
  {
    question: "Which paper is best for ESAT Mathematics 1?",
    answer:
      "NSAA Section 1 Part A is the cleanest large source. ENGAA Part A also contains Mathematics 1, but it duplicates the same year's NSAA Mathematics and Physics questions.",
  },
  {
    question: "Which paper is best for ESAT Mathematics 2?",
    answer:
      "ENGAA Section 1 Part B is the best legacy source. TMUA Paper 1 is useful once you need extra material.",
  },
  {
    question: "Which papers should Chemistry and Biology students use?",
    answer:
      "Use NSAA Section 1 Part C for Chemistry or Part D for Biology. Then use the relevant 2020–2023 NSAA Section 2 part as harder supplementary practice.",
  },
  {
    question: "Should I do NSAA or ENGAA first?",
    answer:
      "Use NSAA first if you take Chemistry or Biology. If you take Mathematics 2 and Physics, ENGAA is equally important, but check the overlaps before doing the second paper from the same year.",
  },
  {
    question: "Should I do ENGAA Section 2?",
    answer:
      "Only after closer material. It is harder Physics, includes out-of-spec content and is less similar to current ESAT. From 2020–2023 it duplicates NSAA Section 2 Part X.",
  },
  {
    question: "Should I use the original paper timings?",
    answer:
      "Not for final preparation. The current ESAT gives 40 minutes for 27 questions in each separately timed module. Move towards that format as the exam approaches.",
  },
];

export const PAST_PAPERS_GUIDE_SOURCES = [
  {
    label: "UAT-UK, ESAT Content Specification for October 2026 and January 2027",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165424/ESAT_Content_Specification.pdf",
  },
  {
    label:
      "UAT-UK, ESAT preparation materials and official 2016–2023 NSAA/ENGAA Section 1 archive",
    url: "https://esat-tmua.ac.uk/esat-preparation-materials/",
  },
  {
    label: "UAT-UK, specimen and practice-test guidance",
    url: "https://esat-tmua.ac.uk/prepare/",
  },
  {
    label: "UAT-UK, TMUA test format",
    url: "https://esat-tmua.ac.uk/about-the-tests/tmua-test/",
  },
  {
    label: "UAT-UK, historic TMUA papers",
    url: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
  {
    label: "ESAT CAMP, full NSAA/ENGAA duplicate methodology and question list",
    url: "https://esatcamp.com/engaa-nsaa-papers-for-esat",
  },
] as const;
