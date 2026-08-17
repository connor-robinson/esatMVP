import { cn } from "@/lib/utils";
import { DUPLICATE_TOTALS } from "@/content/pastPaperQuestionMap";

/**
 * ENGAA and NSAA are not two independent question banks.
 * Counts come from the data so they cannot drift.
 */
export function DuplicateWarning({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const years =
    DUPLICATE_TOTALS.years === 8 ? "2016–2023" : "the archive";

  return (
    <aside className={cn(className)}>
      <p className="text-xl font-medium leading-snug text-white sm:text-2xl">
        Do not sit ENGAA and NSAA from the same year and call it two papers.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
        We compared the official PDFs. {years}:{" "}
        <span className="text-[#94A3B8]">
          {DUPLICATE_TOTALS.verified} identical pairs
        </span>
        , plus {DUPLICATE_TOTALS.likely} near-identical ones. Recognising a
        question is not the same as being able to do it.
      </p>
      {compact ? null : (
        <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
          If you already did ENGAA 2022, skip NSAA 2022 maths and physics. Keep
          NSAA for chemistry and biology. Two scores on the same questions are
          one data point.
        </p>
      )}
    </aside>
  );
}
