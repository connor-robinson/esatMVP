/**
 * Divisibility drill generator
 * Levels:
 * 1 - Remainders (mostly a mod b; rare add/sub/mult mod)
 * 2 - Parity (mixed) - even/odd multiple choice
 * 3 - Divisibility rules for 6, 7, 8, 9, 11 - yes/no multiple choice
 */

import { GeneratedQuestion } from "@/types/core";
import { generateEvenOddRules } from "./even_odd_rules";
import { generateRemainders } from "./modular";
import { generateAdvancedDivisibilityRules } from "./divisibility_rules";

export function generateDivisibility(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  if (level === 1) return generateRemainders(weights);
  if (level === 2) return generateEvenOddRules(2, weights);
  return generateAdvancedDivisibilityRules(weights);
}
