import { cn } from "@/lib/utils";
import { DUPLICATE_TOTALS } from "@/content/pastPaperQuestionMap";

/**
 * The single most useful warning in this section: ENGAA and NSAA are not two
 * independent question banks. Counts come from the data so they cannot drift.
 */
export function DuplicateWarning({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside className={cn("rounded-2xl bg-[#EAB308]/10 p-5 sm:p-6", className)}>
      <p className="text-sm font-bold text-[#FDE68A]">
        ENGAA and NSAA repeat each other
      </p>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#94A3B8]">
        <p>
          In every year from {DUPLICATE_TOTALS.years === 8 ? "2016 to 2023" : "the archive"}
          , a large share of the ENGAA and NSAA Section 1 questions are the same
          questions. We compared the text of the official PDFs and found{" "}
          <span className="font-bold text-white">
            {DUPLICATE_TOTALS.verified} identical pairs
          </span>{" "}
          plus {DUPLICATE_TOTALS.likely} near-identical pairs across{" "}
          {DUPLICATE_TOTALS.years} years.
        </p>
        {compact ? null : (
          <>
            <p>
              This matters for two reasons. You waste practice time solving
              questions you have already seen, and your scores look steadier than
              they are, because recognising a question is not the same as solving
              it.
            </p>
            <p className="font-semibold text-white">
              If a question appears in both papers, count it once. Two scores
              built from the same questions are one data point, not two.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
