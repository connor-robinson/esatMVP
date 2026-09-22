import { cn } from "@/lib/utils";
import { TOPIC_FIRST_ATTEMPT_ACCURACY } from "@/content/esatPreparation";

/** Horizontal bars for weaker high-volume topics. */
export function TopicAccuracyChart({ className }: { className?: string }) {
  const max = 100;

  return (
    <figure className={cn("m-0", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
        Weaker high-volume topics
      </p>
      <ul className="mt-5 space-y-3">
        {TOPIC_FIRST_ATTEMPT_ACCURACY.map((row) => (
          <li key={row.topic}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-white">{row.topic}</span>
              <span className="tabular-nums text-[#94A3B8]">
                {row.accuracyPercent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#3B82F6]"
                style={{ width: `${(row.accuracyPercent / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 text-sm text-[#94A3B8]">
        First-attempt accuracy in the ESAT Camp question bank. Lowest among
        higher-volume curriculum areas shown.
      </figcaption>
    </figure>
  );
}
