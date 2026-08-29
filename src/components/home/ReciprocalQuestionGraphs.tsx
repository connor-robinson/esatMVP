import {
  RECIPROCAL_QUESTION_DOMAIN,
  sampleFunction,
  sampleFunctionSegments,
} from "@/lib/graph-utils";
import { GraphAxes, GraphCurve } from "@/components/home/GraphAxes";

/** Cubic with three x-intercepts and one min below / max above the axis. */
export function fOfX(x: number): number {
  return -0.28 * (x + 2.2) * (x - 0.9) * (x - 3.0);
}

export const RECIPROCAL_ASYMPTOTES = [-2.2, 0.9, 3.0] as const;

export const MAIN_GRAPH_INTERCEPTS = [...RECIPROCAL_ASYMPTOTES];

const DOMAIN = RECIPROCAL_QUESTION_DOMAIN;

function reciprocal(x: number): number {
  const y = fOfX(x);
  if (Math.abs(y) < 1e-5) return Number.NaN;
  return 1 / y;
}

function reciprocalWithSignFlip(
  x: number,
  flipIntervals: [number, number][],
): number {
  const y = reciprocal(x);
  if (!Number.isFinite(y)) return y;
  const inFlip = flipIntervals.some(([a, b]) => x > a && x < b);
  return inFlip ? -y : y;
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
  220,
  2.95,
);

function buildOptionSegments(
  fn: (x: number) => number,
): [number, number][][] {
  return sampleFunctionSegments(
    fn,
    DOMAIN.minX,
    DOMAIN.maxX,
    [...RECIPROCAL_ASYMPTOTES],
    { steps: 160, gap: 0.1, clipY: 2.75 },
  );
}

export const OPTION_GRAPHS: OptionGraph[] = [
  {
    id: "A",
    isCorrect: false,
    asymptotes: [...RECIPROCAL_ASYMPTOTES],
    segments: buildOptionSegments((x) =>
      reciprocalWithSignFlip(x, [[-2.2, 0.9]]),
    ),
  },
  {
    id: "B",
    isCorrect: true,
    asymptotes: [...RECIPROCAL_ASYMPTOTES],
    segments: buildOptionSegments(reciprocal),
  },
  {
    id: "C",
    isCorrect: false,
    asymptotes: [...RECIPROCAL_ASYMPTOTES],
    segments: buildOptionSegments((x) =>
      reciprocalWithSignFlip(x, [[0.9, 3.0]]),
    ),
  },
  {
    id: "D",
    isCorrect: false,
    asymptotes: [...RECIPROCAL_ASYMPTOTES],
    segments: buildOptionSegments((x) =>
      reciprocalWithSignFlip(x, [
        [DOMAIN.minX, -2.2],
        [3.0, DOMAIN.maxX],
      ]),
    ),
  },
];

export function MainReciprocalGraph({
  width,
  height,
  className,
}: {
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <GraphAxes
      width={width}
      height={height}
      showGrid
      showArrows
      showOrigin
      intercepts={MAIN_GRAPH_INTERCEPTS}
      domain={DOMAIN}
      padding={26}
      className={className}
    >
      <GraphCurve segments={[MAIN_F_SEGMENTS]} strokeWidth={2.25} />
    </GraphAxes>
  );
}

export function OptionReciprocalGraph({
  option,
  width,
  height,
  className,
}: {
  option: OptionGraph;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <GraphAxes
      width={width}
      height={height}
      showGrid
      showArrows={false}
      asymptotes={option.asymptotes}
      domain={DOMAIN}
      padding={16}
      className={className}
    >
      <GraphCurve segments={option.segments} strokeWidth={1.75} />
    </GraphAxes>
  );
}

export const CORRECT_OPTION_ID: OptionGraphId = "B";

export const RECIPROCAL_EXPLANATION_MARKDOWN =
  "Zeros of $f(x)$ become vertical asymptotes for $\\dfrac{1}{f(x)}$.";
