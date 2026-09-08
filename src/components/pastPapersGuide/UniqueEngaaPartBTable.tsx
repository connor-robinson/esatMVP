import { UNIQUE_ENGAA_PART_B_BY_YEAR } from "@/content/pastPapersGuide";
import { cn } from "@/lib/utils";

export const UNIQUE_ENGAA_PART_B_TABLE_ID = "unique-engaa-part-b";

const BODY = "text-[15px] leading-relaxed text-[#CBD5E1] sm:text-base";

function QuestionPill({ n }: { n: number }) {
  return (
    <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-lg bg-white px-3 py-2 font-mono text-lg font-bold tabular-nums text-neutral-900 shadow-sm sm:min-w-[3.75rem] sm:px-3.5 sm:py-2.5 sm:text-xl">
      Q{n}
    </span>
  );
}

type Props = {
  compact?: boolean;
};

export function UniqueEngaaPartBTable({ compact = false }: Props) {
  const years = Object.entries(UNIQUE_ENGAA_PART_B_BY_YEAR);

  return (
    <section
      id={UNIQUE_ENGAA_PART_B_TABLE_ID}
      className={cn(
        "scroll-mt-28",
        compact
          ? "overflow-hidden rounded-2xl bg-[#161D2F]"
          : "rounded-2xl bg-white/[0.06] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
      )}
    >
      {compact ? (
        <div className="px-3 py-3">
          <h3 className="text-base font-semibold tracking-tight text-[#F1F5F9]">
            Unique ENGAA Part B questions
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">
            If you have already completed NSAA Part E, these are the only 2016–2019
            ENGAA Part B questions you still need.
          </p>
        </div>
      ) : (
        <>
          <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Unique ENGAA Part B Questions
          </h3>
          <p className={cn("mt-3 max-w-3xl", BODY)}>
            If you have already completed NSAA Part E, these are the only ENGAA Part
            B questions from 2016-2019 that you need.
          </p>
        </>
      )}

      <div
        className={cn(
          "hidden overflow-hidden sm:block",
          compact ? "" : "mt-8 rounded-2xl bg-[#161D2F]",
        )}
      >
        <table className="w-full text-left text-base">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              <th className={cn("w-28", compact ? "px-2.5 py-3" : "px-5 py-3.5")}>
                Year
              </th>
              <th className={compact ? "px-2.5 py-3" : "px-5 py-3.5"}>
                Unique question numbers
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map(([year, questions], index) => (
              <tr
                key={year}
                className={index % 2 === 0 ? "bg-white/[0.035]" : undefined}
              >
                <td
                  className={cn(
                    "align-middle font-mono font-bold text-[#F1F5F9]",
                    compact ? "px-2.5 py-4 text-lg" : "px-5 py-4 text-xl",
                  )}
                >
                  {year}
                </td>
                <td className={cn("align-middle", compact ? "px-2.5 py-4" : "px-5 py-4")}>
                  <div className="flex flex-wrap gap-2.5">
                    {questions.map((q) => (
                      <QuestionPill key={q} n={q} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn("space-y-3 sm:hidden", compact ? "px-3 pb-3" : "mt-6")}>
        {years.map(([year, questions]) => (
          <div key={year} className="rounded-xl bg-black/25 px-4 py-4">
            <p className="font-mono text-xl font-bold text-white">{year}</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {questions.map((q) => (
                <QuestionPill key={q} n={q} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p
        className={cn(
          "font-mono text-sm text-[#94A3B8]",
          compact ? "px-3 pb-3 pt-1" : "mt-5",
        )}
      >
        Question numbers refer to the ENGAA paper.
      </p>
    </section>
  );
}
