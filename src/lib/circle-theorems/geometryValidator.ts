/**
 * Pre-display validation for generated circle theorem questions.
 */

import type { CircleTheoremResult } from "./types";
import { interiorAngleDeg } from "./angleUtils";

const MIN_LABEL_SEP = 12;
const MIN_ARC_DEG = 10;

export function validateCircleTheorem(result: CircleTheoremResult): boolean {
  if (!Number.isFinite(result.answer) || result.answer <= 0 || result.answer >= 180) {
    return false;
  }
  if (!result.steps.length || !result.diagram.angles.length) return false;

  const target = result.diagram.angles.find((a) => a.isTarget);
  if (!target) return false;

  const span = interiorAngleDeg(target.vertex, target.leg1, target.leg2);
  if (span < MIN_ARC_DEG) return false;

  const pts = result.diagram.points;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_LABEL_SEP && pts[i].label !== pts[j].label) {
        return false;
      }
    }
  }

  for (const ra of result.diagram.rightAngles) {
    const measured = interiorAngleDeg(ra.vertex, ra.leg1, ra.leg2);
    if (Math.abs(measured - 90) > 2) return false;
  }

  return true;
}
