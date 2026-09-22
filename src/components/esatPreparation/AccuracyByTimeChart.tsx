import { cn } from "@/lib/utils";
import { PACING_ACCURACY_BY_TIME } from "@/content/esatPreparation";

/** Accuracy by time spent on a question. Percentages only. */
export function AccuracyByTimeChart({ className }: { className?: string }) {
  const max = Math.max(
    ...PACING_ACCURACY_BY_TIME.map((bucket) => bucket.accuracyPercent),
  );
  const chartHeight = 140;

  return (
    <figure className={cn("m-0 -mx-1 sm:mx-0", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
        Accuracy by time spent
      </p>
      <svg
        viewBox="0 0 400 190"
        role="img"
        aria-label="First-attempt accuracy by time spent on the question"
        className="mt-4 h-auto w-full"
      >
        <title>Accuracy by time spent on a question</title>
        {PACING_ACCURACY_BY_TIME.map((bucket, index) => {
          const barWidth = 64;
          const gap = 28;
          const x = 24 + index * (barWidth + gap);
          const height = (bucket.accuracyPercent / max) * chartHeight;
          const y = 28 + chartHeight - height;
          const isPeak = bucket.accuracyPercent === max;
          return (
            <g key={bucket.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="8"
                fill={isPeak ? "#3B82F6" : "#64748B"}
                opacity={isPeak ? 1 : 0.65}
              />
              <text
                x={x + barWidth / 2}
                y={y - 10}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="12"
                fontWeight="700"
              >
                {bucket.accuracyPercent}%
              </text>
              <text
                x={x + barWidth / 2}
                y={28 + chartHeight + 24}
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
        First-attempt accuracy in the question bank, grouped by time spent.
        Association only, not a causal claim.
      </figcaption>
    </figure>
  );
}
