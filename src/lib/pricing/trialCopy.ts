import { MENTAL_MATHS_MODULE_COUNT_MARKETING } from "@/config/mentalMathsMarketing";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { FREE_TIER_LIMIT_PER_SUBJECT } from "@/lib/questionBank/freeTierQuestions";

/**
 * Shared free vs trial benefit copy for onboarding + dashboard CTAs.
 * Counts come from marketing/config constants so they stay aligned.
 */
export const TRIAL_DAYS = 4;

const QB_TOTAL_LABEL = `${QUESTION_BANK_TOTAL_COUNT.toLocaleString("en-GB")} Question Bank questions`;
const MENTAL_MATHS_LABEL = `${MENTAL_MATHS_MODULE_COUNT_MARKETING} mental maths training modules`;

export type FreeCompareItem = {
  label: string;
  /** true = tick (included on free), false = cross (not on free). */
  included: boolean;
};

/** All items on the free-trial column (always included). */
export const TRIAL_PLAN_ITEMS = [
  QB_TOTAL_LABEL,
  MENTAL_MATHS_LABEL,
  "All past papers + roadmap",
  "ESAT Camp mock papers",
  "Solutions, stats & drills",
] as const;

/** Free column: mix of what's included and what isn't. */
export const FREE_PLAN_ITEMS: readonly FreeCompareItem[] = [
  {
    label: `${FREE_TIER_LIMIT_PER_SUBJECT} Question Bank questions / subject`,
    included: true,
  },
  {
    label: "3 mental maths topics",
    included: true,
  },
  {
    label: "NSAA 2016 & 2017 past papers",
    included: true,
  },
  {
    label: "Mock papers",
    included: false,
  },
  {
    label: "Solutions & stats",
    included: false,
  },
];

/** @deprecated Prefer TRIAL_PLAN_ITEMS */
export const TRIAL_PLAN_BENEFITS = TRIAL_PLAN_ITEMS;
/** @deprecated Prefer FREE_PLAN_ITEMS */
export const FREE_PLAN_BENEFITS = FREE_PLAN_ITEMS.map((item) => item.label);

export const TRIAL_CHECKOUT_NOTE =
  "4 days free. Card required. Cancel anytime.";
