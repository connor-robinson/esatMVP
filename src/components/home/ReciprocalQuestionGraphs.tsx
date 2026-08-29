"use client";

import {
  RECIPROCAL_QUESTION_DOMAIN,
  RECIPROCAL_ROOTS,
  sampleFunction,
  sampleFunctionSegments,
} from "@/lib/graph-utils";
import { GraphAxes, GraphCurve } from "@/components/home/GraphAxes";

/** Scaled cubic with three x-intercepts at RECIPROCAL_ROOTS. */
export function fOfX(x: number): number {
  return -0.32 * (x + 1.6) * (x - 0.5) * (x - 2.2);
}

export const RECIPROCAL_ASYMPTOTES = [...RECIPROCAL_ROOTS];
export const MAIN_GRAPH_INTERCEPTS = [...RECIPROCAL_ROOTS];

const DOMAIN = RECIPROCAL_QUESTION_DOMAIN;
const [R1, , R3] = RECIPROCAL_ROOTS;

export const MAIN_GRAPH_VIEW = { width: 360, height: 252 } as const;
export const OPTION_GRAPH_VIEW = { width: 280, height: 118 } as const;

function reciprocal(x: number): number {
  const y = fOfX(x);
  if (Math.abs(y) < 1e-6) return Number.NaN;
  return 1 / y;
}

function negReciprocal(x: number): number {
  const y = reciprocal(x);
  return Number.isFinite(y) ? -y : y;
}

function absReciprocal(x: number): number {
  const y = fOfX(x);
  if (Math.abs(y) < 1e-6) return Number.NaN;
  return 1 / Math.abs(y);
}

/** Wrong signs on outer branches only; middle intervals stay correct. */
function wrongOuterReciprocal(x: number): number {
  const y = reciprocal(x);
  if (!Number.isFinite(y)) return y;
  if (x < R1 || x > R3) return -y;
  return y;
}

export type OptionGraphId = "A" | "B" | "C" | "D";

export type OptionGraph = {
  id: OptionGraphId;
  isCorrect: boolean;
  segments: [number, number][][];
  asymptotes: number[];
};

const MAIN_F_SEGMENTS = sampleFunction(
  fOfX,
  DOMAIN.minX,
  DOMAIN.maxX,
  240,
  DOMAIN.maxY - 0.05,
);

function buildReciprocalSegments(
  fn: (x: number) => number,
): [number, number][][] {
  return sampleFunctionSegments(
    fn,
    DOMAIN.minX,
    DOMAIN.maxX,
    RECIPROCAL_ROOTS,
    { steps: 180, clipY: DOMAIN.maxY - 0.08 },
  );
}

export const OPTION_GRAPHS: OptionGraph[] = [
  {
    id: "A",
    isCorrect: false,
    asymptotes: RECIPROCAL_ASYMPTOTES,
    segments: buildReciprocalSegments(negReciprocal),
  },
  {
    id: "B",
    isCorrect: true,
    asymptotes: RECIPROCAL_ASYMPTOTES,
    segments: buildReciprocalSegments(reciprocal),
  },
  {
    id: "C",
    isCorrect: false,
    asymptotes: RECIPROCAL_ASYMPTOTES,
    segments: buildReciprocalSegments(absReciprocal),
  },
  {
    id: "D",
    isCorrect: false,
    asymptotes: RECIPROCAL_ASYMPTOTES,
    segments: buildReciprocalSegments(wrongOuterReciprocal),
  },
];

export function MainReciprocalGraph({ className }: { className?: string }) {
  const { width, height } = MAIN_GRAPH_VIEW;
  return (
    <GraphAxes
      width={width}
      height={height}
      variant="main"
      showGrid
      showArrows
      showOrigin
      intercepts={MAIN_GRAPH_INTERCEPTS}
      domain={DOMAIN}
      className={className}
    >
      <GraphCurve segments={[MAIN_F_SEGMENTS]} stroke="white" strokeWidth={2} />
    </GraphAxes>
  );
}

export function OptionReciprocalGraph({
  option,
  className,
}: {
  option: OptionGraph;
  className?: string;
}) {
  const { width, height } = OPTION_GRAPH_VIEW;
  return (
    <GraphAxes
      width={width}
      height={height}
      variant="option"
      showGrid={false}
      showArrows={false}
      asymptotes={option.asymptotes}
      domain={DOMAIN}
      className={className}
    >
      <GraphCurve
        segments={option.segments}
        stroke="rgba(226,232,240,0.92)"
        strokeWidth={1.85}
      />
    </GraphAxes>
  );
}

export const CORRECT_OPTION_ID: OptionGraphId = "B";

export const RECIPROCAL_EXPLANATION_MARKDOWN =
  "Zeros of $f(x)$ become vertical asymptotes for $\\dfrac{1}{f(x)}$, and each branch keeps the same sign as $f(x)$.";
