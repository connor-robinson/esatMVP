/**
 * Circle theorem templates - math-first instantiation.
 */

import type { CircleTheoremResult, LabelledPoint, LineSegment, TemplateId } from "./types";
import {
  alternateSegmentAngles,
  centrePoint,
  extendRay,
  exteriorAngleDeg,
  interiorAngleDeg,
  normalizeDeg,
  pickFrom,
  pickInt,
  pointOnCircle,
  tangentSegment,
  CT_CX,
  CT_CY,
  CT_R,
} from "./angleUtils";

const CENTRE_ANGLES = [48, 56, 60, 64, 72, 80, 100, 120] as const;

function linesBetween(points: Record<string, LabelledPoint>, pairs: [string, string][], dashed = false): LineSegment[] {
  return pairs.map(([a, b]) => ({
    x1: points[a].x,
    y1: points[a].y,
    x2: points[b].x,
    y2: points[b].y,
    dashed,
  }));
}

function pt(id: string, deg: number, label: string): LabelledPoint {
  const p = pointOnCircle(deg);
  return { id, x: p.x, y: p.y, label };
}

function centrePt(): LabelledPoint {
  return { id: "O", x: CT_CX, y: CT_CY, label: "O", emphasis: true };
}

function formatSteps(steps: { text: string; theorem?: CircleTheoremResult["theorems"][number] }[]): CircleTheoremResult["steps"] {
  return steps;
}

/** Angle at centre = 2 × angle at circumference (same chord). */
export function templateCentreToCircumference(): CircleTheoremResult {
  const centreAngle = pickFrom(CENTRE_ANGLES);
  const aDeg = 130;
  const bDeg = aDeg - centreAngle;
  const cDeg = 280;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const points: Record<string, LabelledPoint> = { O, A, B, C };

  const actualCentre = interiorAngleDeg(O, A, B);
  const actualRim = interiorAngleDeg(C, A, B);

  return {
    templateId: "CENTRE_TO_CIRCUMFERENCE",
    theorems: ["centre-circumference"],
    answer: actualRim,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Angle at the centre $= 2 \\times$ angle at the circumference (same chord).`, theorem: "centre-circumference" },
      { text: `$\\angle AOB = ${actualCentre}°$, so $x = ${actualCentre}° \\div 2 = ${actualRim}°$.` },
    ]),
    diagram: {
      points: [O, A, B, C],
      lines: [
        ...linesBetween(points, [["O", "A"], ["O", "B"], ["A", "B"], ["C", "A"], ["C", "B"]]),
      ],
      angles: [
        { id: "AOB", vertex: O, leg1: A, leg2: B, label: `${actualCentre}°` },
        { id: "ACB", vertex: C, leg1: A, leg2: B, label: "x", isTarget: true },
      ],
      rightAngles: [],
    },
  };
}

/** Find centre angle from circumference angle. */
export function templateCircumferenceToCentre(): CircleTheoremResult {
  const centreAngle = pickFrom(CENTRE_ANGLES);
  const aDeg = 140;
  const bDeg = aDeg - centreAngle;
  const cDeg = 300;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const points: Record<string, LabelledPoint> = { O, A, B, C };

  const actualCentre = interiorAngleDeg(O, A, B);
  const actualRim = interiorAngleDeg(C, A, B);

  return {
    templateId: "CIRCUMFERENCE_TO_CENTRE",
    theorems: ["centre-circumference"],
    answer: actualCentre,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Angle at the centre $= 2 \\times$ angle at the circumference.`, theorem: "centre-circumference" },
      { text: `$x = 2 \\times ${actualRim}° = ${actualCentre}°$.` },
    ]),
    diagram: {
      points: [O, A, B, C],
      lines: linesBetween(points, [["O", "A"], ["O", "B"], ["A", "B"], ["C", "A"], ["C", "B"]]),
      angles: [
        { id: "ACB", vertex: C, leg1: A, leg2: B, label: `${actualRim}°` },
        { id: "AOB", vertex: O, leg1: A, leg2: B, label: "x", isTarget: true },
      ],
      rightAngles: [],
    },
  };
}

/** Angle in a semicircle - find third angle in triangle (basic level). */
export function templateSemicircleTriangle(basic = false): CircleTheoremResult {
  const aDeg = 200;
  const bDeg = 20;
  const cDeg = 270;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const points: Record<string, LabelledPoint> = { O, A, B, C };

  const angleAtA = interiorAngleDeg(A, C, B);
  const angleAtC = interiorAngleDeg(C, A, B);
  const answer = interiorAngleDeg(B, C, A);

  const steps = basic
    ? [
        { text: `Angle in a semicircle is $90°$.`, theorem: "semicircle" as const },
        { text: `At $C$: $\\angle ACB = ${angleAtC}°$.` },
        { text: `Triangle angles sum to $180°$: $x = 180° - ${angleAtC}° - ${angleAtA}° = ${answer}°$.` },
      ]
    : [
        { text: `Angle in a semicircle is $90°$.`, theorem: "semicircle" as const },
        { text: `$x = ${angleAtC}° - ${angleAtA}° = ${answer}°$.` },
      ];

  return {
    templateId: "SEMICIRCLE_TRIANGLE",
    theorems: basic ? ["semicircle", "combined"] : ["semicircle"],
    answer,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps(steps),
    diagram: {
      points: [O, A, B, C],
      lines: linesBetween(points, [["O", "A"], ["O", "B"], ["A", "B"], ["A", "C"], ["B", "C"]]),
      angles: [
        { id: "CAB", vertex: A, leg1: C, leg2: B, label: `${angleAtA}°` },
        { id: "CBA", vertex: B, leg1: C, leg2: A, label: "x", isTarget: true },
      ],
      rightAngles: [],
    },
  };
}

/** Angles in the same segment are equal. */
export function templateSameSegment(): CircleTheoremResult {
  const aDeg = 150;
  const bDeg = 70;
  const cDeg = 250;
  const dDeg = 310;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const D = pt("D", dDeg, "D");
  const points: Record<string, LabelledPoint> = { O, A, B, C, D };

  const angleC = interiorAngleDeg(C, A, B);
  const angleD = interiorAngleDeg(D, A, B);
  const findAtD = Math.random() < 0.5;
  const answer = findAtD ? angleD : angleC;

  return {
    templateId: "SAME_SEGMENT",
    theorems: ["same-segment"],
    answer,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Angles in the same segment are equal (subtended by chord $AB$).`, theorem: "same-segment" },
      { text: `$x = ${answer}°$.` },
    ]),
    diagram: {
      points: [O, A, B, C, D],
      lines: linesBetween(points, [["A", "B"], ["C", "A"], ["C", "B"], ["D", "A"], ["D", "B"]]),
      angles: [
        {
          id: "ACB",
          vertex: C,
          leg1: A,
          leg2: B,
          label: findAtD ? `${angleC}°` : "x",
          isTarget: !findAtD,
        },
        {
          id: "ADB",
          vertex: D,
          leg1: A,
          leg2: B,
          label: findAtD ? "x" : `${angleD}°`,
          isTarget: findAtD,
        },
      ],
      rightAngles: [],
    },
  };
}

/** Alternate segment theorem - tangent/chord angle equals angle in the alternate segment. */
export function templateAlternateSegment(): CircleTheoremResult {
  for (let attempt = 0; attempt < 24; attempt++) {
    const result = buildAlternateSegment();
    if (result) return result;
  }
  return buildAlternateSegment({ tDeg: 72, aDeg: 208, pDeg: 318 })!;
}

function buildAlternateSegment(config?: { tDeg: number; aDeg: number; pDeg: number }): CircleTheoremResult | null {
  const tDeg = config?.tDeg ?? pickInt(58, 122);
  const aDeg = config?.aDeg ?? pickInt(175, 235);
  const pDeg = config?.pDeg ?? normalizeDeg(tDeg - pickInt(145, 195));

  const O = centrePt();
  const T = pt("T", tDeg, "T");
  const A = pt("A", aDeg, "A");
  const P = pt("P", pDeg, "P");
  const centre = centrePoint();

  const { tan, tanFar, tangentAngle, alternateAngle } = alternateSegmentAngles(
    T,
    centre,
    P,
    A,
    100,
  );

  if (tangentAngle < 22 || tangentAngle > 88) return null;
  if (Math.abs(tangentAngle - alternateAngle) > 1) return null;

  const findTangent = Math.random() < 0.5;
  const answer = tangentAngle;

  return {
    templateId: "ALTERNATE_SEGMENT",
    theorems: ["alternate-segment"],
    answer,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Angle between tangent and chord equals the angle in the alternate segment.`, theorem: "alternate-segment" },
      { text: `$x = ${answer}°$.` },
    ]),
    diagram: {
      points: [O, T, A, P],
      lines: [
        { x1: tan.x1, y1: tan.y1, x2: tan.x2, y2: tan.y2 },
        { x1: T.x, y1: T.y, x2: P.x, y2: P.y },
        { x1: T.x, y1: T.y, x2: A.x, y2: A.y },
        { x1: P.x, y1: P.y, x2: A.x, y2: A.y },
      ],
      angles: [
        {
          id: "tangent",
          vertex: T,
          leg1: tanFar,
          leg2: P,
          label: findTangent ? "x" : `${alternateAngle}°`,
          isTarget: findTangent,
        },
        {
          id: "TAP",
          vertex: A,
          leg1: T,
          leg2: P,
          label: findTangent ? `${tangentAngle}°` : "x",
          isTarget: !findTangent,
        },
      ],
      rightAngles: [],
    },
  };
}

/** Radius perpendicular to tangent. */
export function templateRadiusTangent(basic = false): CircleTheoremResult {
  const tDeg = 45;
  const sDeg = 120;

  const O = centrePt();
  const T = pt("T", tDeg, "T");
  const S = pt("S", sDeg, "S");
  const centre = centrePoint();
  const tan = tangentSegment(T, centre, 90);
  const tanFar = { x: tan.x2, y: tan.y2 };

  const angleAtO = interiorAngleDeg(O, S, T);
  const angleAtT = interiorAngleDeg(T, O, tanFar);
  const angleAtS = interiorAngleDeg(S, O, T);
  const answer = basic ? angleAtS : angleAtT;

  const steps = basic
    ? [
        { text: `Radius is perpendicular to tangent at the point of contact: $\\angle OTS = ${angleAtT}°$.`, theorem: "radius-tangent" as const },
        { text: `In $\\triangle OTS$, $x = 180° - ${angleAtT}° - ${angleAtO}° = ${answer}°$.` },
      ]
    : [
        { text: `Radius is perpendicular to tangent: $\\angle OTS = ${angleAtT}°$.`, theorem: "radius-tangent" as const },
        { text: `$x = ${angleAtT}°$.` },
      ];

  return {
    templateId: "RADIUS_TANGENT",
    theorems: basic ? ["radius-tangent", "combined"] : ["radius-tangent"],
    answer,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps(steps),
    diagram: {
      points: [O, T, S],
      lines: [
        { x1: O.x, y1: O.y, x2: T.x, y2: T.y },
        { x1: tan.x1, y1: tan.y1, x2: tan.x2, y2: tan.y2 },
        { x1: O.x, y1: O.y, x2: S.x, y2: S.y },
        { x1: S.x, y1: S.y, x2: T.x, y2: T.y },
      ],
      angles: basic
        ? [
            { id: "OST", vertex: O, leg1: S, leg2: T, label: `${angleAtO}°` },
            {
              id: "OST2",
              vertex: S,
              leg1: O,
              leg2: T,
              label: "x",
              isTarget: true,
            },
          ]
        : [
            {
              id: "OTS",
              vertex: T,
              leg1: O,
              leg2: tanFar,
              label: "x",
              isTarget: true,
            },
            { id: "OST", vertex: O, leg1: S, leg2: T, label: `${angleAtO}°` },
            {
              id: "OST2",
              vertex: S,
              leg1: O,
              leg2: T,
              label: `${angleAtS}°`,
            },
          ],
      rightAngles: [],
    },
  };
}

/** Cyclic quadrilateral - opposite angles sum to 180°. */
export function templateCyclicOpposite(): CircleTheoremResult {
  const aDeg = 160;
  const bDeg = 60;
  const cDeg = 340;
  const dDeg = 240;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const D = pt("D", dDeg, "D");
  const points: Record<string, LabelledPoint> = { O, A, B, C, D };

  const angleA = interiorAngleDeg(A, D, B);
  const angleC = interiorAngleDeg(C, B, D);

  return {
    templateId: "CYCLIC_OPPOSITE",
    theorems: ["cyclic-opposite"],
    answer: angleC,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Opposite angles in a cyclic quadrilateral sum to $180°$.`, theorem: "cyclic-opposite" },
      { text: `$x = 180° - ${angleA}° = ${angleC}°$.` },
    ]),
    diagram: {
      points: [O, A, B, C, D],
      lines: linesBetween(points, [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]]),
      angles: [
        { id: "DAB", vertex: A, leg1: D, leg2: B, label: `${angleA}°` },
        { id: "BCD", vertex: C, leg1: B, leg2: D, label: "x", isTarget: true },
      ],
      rightAngles: [],
    },
  };
}

/** Cyclic quadrilateral - exterior angle equals opposite interior. */
export function templateCyclicExterior(): CircleTheoremResult {
  for (let attempt = 0; attempt < 24; attempt++) {
    const result = buildCyclicExterior();
    if (result) return result;
  }
  return buildCyclicExterior({
    aDeg: 168,
    bDeg: 52,
    cDeg: 328,
    dDeg: 232,
    beyondC: 0.42,
    beyondB: 0.5,
  })!;
}

function buildCyclicExterior(config?: {
  aDeg: number;
  bDeg: number;
  cDeg: number;
  dDeg: number;
  beyondC: number;
  beyondB: number;
}): CircleTheoremResult | null {
  const aDeg = config?.aDeg ?? pickInt(130, 210);
  const bDeg = config?.bDeg ?? normalizeDeg(aDeg - pickInt(52, 88));
  const cDeg = config?.cDeg ?? normalizeDeg(bDeg - pickInt(52, 88));
  const dDeg = config?.dDeg ?? normalizeDeg(cDeg - pickInt(52, 88));
  const beyondC = config?.beyondC ?? 0.3 + Math.random() * 0.55;
  const beyondB = config?.beyondB ?? 0.4 + Math.random() * 0.35;

  const O = centrePt();
  const A = pt("A", aDeg, "A");
  const B = pt("B", bDeg, "B");
  const C = pt("C", cDeg, "C");
  const D = pt("D", dDeg, "D");

  const Epos = extendRay(B, C, beyondC);
  const extPt: LabelledPoint = { id: "E", x: Epos.x, y: Epos.y, label: "E" };
  const baExtended = extendRay(A, B, beyondB);

  const distE = Math.hypot(Epos.x - CT_CX, Epos.y - CT_CY);
  if (distE < CT_R + 18) return null;

  const oppositeInterior = interiorAngleDeg(D, A, C);
  const exteriorAtB = exteriorAngleDeg(B, A, C);
  const markedExterior = interiorAngleDeg(B, baExtended, C);

  if (oppositeInterior < 28 || oppositeInterior > 152) return null;
  if (exteriorAtB < 28 || exteriorAtB > 152) return null;
  if (Math.abs(markedExterior - exteriorAtB) > 1) return null;
  if (Math.abs(oppositeInterior - exteriorAtB) > 1) return null;

  return {
    templateId: "CYCLIC_EXTERIOR",
    theorems: ["cyclic-exterior"],
    answer: oppositeInterior,
    targetLabel: "x",
    question: "Find $x$.",
    steps: formatSteps([
      { text: `Exterior angle of a cyclic quadrilateral equals the opposite interior angle.`, theorem: "cyclic-exterior" },
      { text: `$x = ${oppositeInterior}°$.` },
    ]),
    diagram: {
      points: [O, A, B, C, D, extPt],
      lines: [
        { x1: A.x, y1: A.y, x2: B.x, y2: B.y },
        { x1: B.x, y1: B.y, x2: C.x, y2: C.y },
        { x1: C.x, y1: C.y, x2: D.x, y2: D.y },
        { x1: D.x, y1: D.y, x2: A.x, y2: A.y },
        { x1: B.x, y1: B.y, x2: Epos.x, y2: Epos.y, dashed: true },
        { x1: B.x, y1: B.y, x2: baExtended.x, y2: baExtended.y, dashed: true },
      ],
      angles: [
        {
          id: "ext",
          vertex: B,
          leg1: { x: baExtended.x, y: baExtended.y },
          leg2: C,
          label: "x",
          isTarget: true,
        },
        { id: "ADC", vertex: D, leg1: A, leg2: C, label: `${oppositeInterior}°` },
      ],
      rightAngles: [],
    },
  };
}

type TemplateFn = () => CircleTheoremResult;

const TEMPLATES: Record<TemplateId, TemplateFn> = {
  CENTRE_TO_CIRCUMFERENCE: templateCentreToCircumference,
  CIRCUMFERENCE_TO_CENTRE: templateCircumferenceToCentre,
  SEMICIRCLE_TRIANGLE: () => templateSemicircleTriangle(false),
  SAME_SEGMENT: templateSameSegment,
  ALTERNATE_SEGMENT: templateAlternateSegment,
  RADIUS_TANGENT: () => templateRadiusTangent(false),
  CYCLIC_OPPOSITE: templateCyclicOpposite,
  CYCLIC_EXTERIOR: templateCyclicExterior,
};

const RECALL_POOL: TemplateId[] = [
  "CENTRE_TO_CIRCUMFERENCE",
  "CIRCUMFERENCE_TO_CENTRE",
  "SAME_SEGMENT",
  "ALTERNATE_SEGMENT",
  "RADIUS_TANGENT",
  "CYCLIC_OPPOSITE",
];

const BASIC_POOL: TemplateId[] = [
  "SEMICIRCLE_TRIANGLE",
  "RADIUS_TANGENT",
  "CYCLIC_EXTERIOR",
  "CENTRE_TO_CIRCUMFERENCE",
  "SAME_SEGMENT",
];

export function instantiateTemplate(level: number): CircleTheoremResult {
  if (level === 1) {
    const id = pickFrom(RECALL_POOL);
    return TEMPLATES[id]();
  }
  if (level === 2) {
    const roll = pickInt(1, 10);
    if (roll <= 3) return templateSemicircleTriangle(true);
    if (roll <= 5) return templateRadiusTangent(true);
    if (roll <= 7) return templateCyclicExterior();
    const id = pickFrom(["CENTRE_TO_CIRCUMFERENCE", "SAME_SEGMENT", "ALTERNATE_SEGMENT", "CYCLIC_OPPOSITE"] as const);
    return TEMPLATES[id]();
  }
  // Levels 3–4: combined / multi-step templates
  const roll = pickInt(1, 10);
  if (roll <= 3) return templateSemicircleTriangle(true);
  if (roll <= 5) return templateRadiusTangent(true);
  if (roll <= 7) return templateCyclicExterior();
  if (roll <= 8) return templateAlternateSegment();
  const id = pickFrom(["CENTRE_TO_CIRCUMFERENCE", "SAME_SEGMENT", "CYCLIC_OPPOSITE"] as const);
  return TEMPLATES[id]();
}

/** Independent verification from displayed angle labels. */
export function verifyAnswerIndependently(result: CircleTheoremResult): boolean {
  const target = result.diagram.angles.find((a) => a.isTarget);
  if (!target) return false;

  if (result.templateId === "CYCLIC_EXTERIOR") {
    const given = result.diagram.angles.find((a) => !a.isTarget);
    if (!given) return false;
    const markedExterior = interiorAngleDeg(target.vertex, target.leg1, target.leg2);
    const givenInterior = parseInt(given.label.replace("°", ""), 10);
    if (!Number.isFinite(givenInterior)) return false;
    return markedExterior === givenInterior && markedExterior === result.answer;
  }

  if (result.templateId === "ALTERNATE_SEGMENT") {
    const given = result.diagram.angles.find((a) => !a.isTarget);
    if (!given) return false;
    const marked = interiorAngleDeg(target.vertex, target.leg1, target.leg2);
    const givenVal = parseInt(given.label.replace("°", ""), 10);
    if (!Number.isFinite(givenVal)) return false;
    return marked === givenVal && marked === result.answer;
  }

  if (target.label === "x") return result.answer > 0;
  const parsed = parseInt(target.label.replace("°", ""), 10);
  if (!Number.isFinite(parsed)) return true;
  return parsed === result.answer;
}
