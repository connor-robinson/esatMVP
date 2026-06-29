/**
 * Powers of 2, 4, and 8 (arithmetic Powers & Surds folder)
 */

import { GeneratedQuestion } from "@/types/core";
import { generatePowersMixed } from "./powers";

export function generatePowerBases(
  _level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  return { ...generatePowersMixed(), topicId: "power_bases" };
}
