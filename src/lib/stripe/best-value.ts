/**
 * Best value calculation for pricing plans
 * Exam date: 1 Oct 2026
 */

const EXAM_DATE = new Date("2026-10-01");

/** Weekly plan rate — Season Pass must beat this on a £/week basis. */
const WEEKLY_RATE = 8;
/** Target Season Pass rate (£/week) — £1 cheaper than Weekly. */
const SEASON_PASS_TARGET_RATE = 7;

export type PlanId = "free" | "weekly" | "monthly" | "season_pass";

export interface PlanComparison {
  id: PlanId;
  label: string;
  pricePerWeek: number;
  totalCost?: number;
  weeksOfAccess?: number;
  reason?: string;
}

export function getWeeksUntilExam(): number {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

/**
 * Early-bird list prices (higher when more weeks remain).
 * Late in the season we switch to a competitive £7/week one-time
 * so Season Pass always beats Weekly on effective rate.
 */
function getScheduledSeasonPassPrice(): number {
  const now = new Date();
  if (now < new Date("2026-04-01")) return 74;
  if (now < new Date("2026-05-16")) return 84;
  if (now < new Date("2026-06-10")) return 94;
  return 94;
}

/**
 * One-time Exam Season Pass price.
 * Uses the lower of the early-bird schedule and weeks × £7
 * so the deal is always better than paying Weekly (£8/week).
 */
export function getSeasonPassPrice(): number {
  const weeks = getWeeksUntilExam();
  const competitive = weeks * SEASON_PASS_TARGET_RATE;
  const scheduled = getScheduledSeasonPassPrice();
  // Round down to nearest £5 for a cleaner checkout amount
  const roundedCompetitive = Math.max(
    SEASON_PASS_TARGET_RATE,
    Math.floor(competitive / 5) * 5
  );
  return Math.min(scheduled, roundedCompetitive);
}

export function getPlanComparisons(weeksUntilExam?: number): PlanComparison[] {
  const weeks = weeksUntilExam ?? getWeeksUntilExam();
  const seasonPrice = getSeasonPassPrice();
  const seasonPerWeek = seasonPrice / weeks;

  return [
    { id: "free", label: "Free", pricePerWeek: 0 },
    { id: "weekly", label: "Weekly", pricePerWeek: WEEKLY_RATE },
    { id: "monthly", label: "Monthly", pricePerWeek: 6.25 },
    {
      id: "season_pass",
      label: "Exam Season Pass",
      pricePerWeek: seasonPerWeek,
      totalCost: seasonPrice,
      weeksOfAccess: weeks,
    },
  ];
}

export function getBestValuePlan(
  weeksUntilExam?: number
): { plan: PlanId; reason: string } {
  const weeks = weeksUntilExam ?? getWeeksUntilExam();
  const plans = getPlanComparisons(weeks).filter((p) => p.id !== "free");

  const best = plans.reduce((a, b) =>
    a.pricePerWeek <= b.pricePerWeek ? a : b
  );

  if (best.id === "season_pass" && weeks >= 17) {
    return {
      plan: "season_pass",
      reason: "If you plan to prepare for 4+ months, this will save you money.",
    };
  }
  if (best.id === "monthly") {
    return {
      plan: "monthly",
      reason: "Best value for shorter preparation periods.",
    };
  }
  return {
    plan: best.id,
    reason: `£${best.pricePerWeek.toFixed(1)}/week - best value for your timeline.`,
  };
}
