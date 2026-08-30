import { APP_ROUTES, type FaqItem } from "@/lib/seo/config";

export const DRILL_PAGE_PATH = APP_ROUTES.noCalcPractice;

export const DRILL_PAGE_TITLE =
  "ESAT No-Calculator Practice | Speed & Accuracy Training";

export const DRILL_PAGE_DESCRIPTION =
  "Improve ESAT no-calculator speed with targeted practice for fractions, ratios, algebra, estimation, units and formula rearrangement.";

export const DRILL_EXAMPLE_ITEMS = [
  "Single-digit addition under time pressure (e.g. 47 + 38).",
  "Fraction and ratio manipulation (e.g. simplify 3/8 of 240).",
  "Special-triangle trig recall (e.g. sin 30°, cos 45°).",
] as const;

export const DRILL_FAQ: readonly FaqItem[] = [
  {
    question: "How long should a no-calculator session be?",
    answer:
      "Ten minutes done most days beats an hour done once a week. The skills you are training are recall and pattern recognition, which respond to frequency rather than session length.",
  },
  {
    question: "Does no-calculator practice only help Maths 1?",
    answer:
      "No. It also affects Physics, Chemistry and Biology questions, because those involve ratios, units, powers and graph gradients that all rely on the same underlying arithmetic.",
  },
  {
    question: "Is this practice free?",
    answer:
      "The addition module of the mental maths trainer and the calibration test are free to use. Full access to every module and the question bank is part of a paid plan.",
  },
];
