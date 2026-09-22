import { cn } from "@/lib/utils";
import { CALIBRATION_SCORE_DISTRIBUTION } from "@/content/esatPreparation";

/** Compact calibration score distribution. Percentages only. */
export function CalibrationScoreChart({ className }: { className?: string }) {
  const max = Math.max(
    ...CALIBRATION_SCORE_DISTRIBUTION.map((bucket) => bucket.percent),
  );
  const chartHeight = 120;

  return (
    <figure className={cn("m-0", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
        Calibration score distribution
      </p>
      <svg
        viewBox="0 0 360 168"
        role="img"
        aria-label="Distribution of Maths 1 calibration scores by percentage of attempts"
        className="mt-4 h-auto w-full max-w-lg"
      >
        <title>Calibration score distribution (percent of attempts)</title>
        {CALIBRATION_SCORE_DISTRIBUTION.map((bucket, index) => {
          const barWidth = 48;
          const gap = 18;
          const x = 28 + index * (barWidth + gap);
          const height = (bucket.percent / max) * chartHeight;
          const y = 20 + chartHeight - height;
          return (
            <g key={bucket.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="6"
                fill="#3B82F6"
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="11"
                fontWeight="700"
              >
                {bucket.percent}%
              </text>
              <text
                x={x + barWidth / 2}
                y={20 + chartHeight + 22}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="12"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-sm text-[#94A3B8]">
        Share of attempts by raw score out of 15. Built from anonymised first
        calibrations.
      </figcaption>
    </figure>
  );
}
