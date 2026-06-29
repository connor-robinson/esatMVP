/**
 * Pre-display validation for generated circle theorem questions.
 */

import type { CircleTheoremResult } from "./types";
import { interiorAngleDeg } from "./angleUtils";

const MIN_LABEL_SEP = 12;
const MIN_ARC_SPAN = 10;

export function validateCircleTheorem(result: CircleTheoremResult): boolean {
  if (!Number.isFinite(result.answer) || result.answer <= 0 || result.answer >= 180) {
    return false;
  }
  if (!result.steps.length || !result.diagram.angles.length) return false;

  const target = result.diagram.angles.find((a) => a.isTarget);
  if (!target) return false;

  const span = Math.abs(target.leg2Deg - target.leg1Deg);
  const arcSpan = span > 180 ? 360 - span : span;
  if (arcSpan < MIN_ARC_SPAN) return false;

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
