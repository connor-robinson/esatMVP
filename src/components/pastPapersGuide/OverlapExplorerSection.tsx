import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UNIQUE_ENGAA_PART_B_BY_YEAR } from "@/content/pastPapersGuide";
import { SEO_ROUTES } from "@/lib/seo/config";
import { ON_SOLID_SUBJECT_TEXT } from "@/config/colors";
import { cn } from "@/lib/utils";

const BODY = "text-[15px] leading-relaxed text-[#CBD5E1] sm:text-base";
const UNIQUE_TABLE_ID = "unique-engaa-part-b";

type ActionKind = "skip" | "unique" | "complete" | "optional";

type OverlapRow = {
  engaa: string;
  relationship: string;
  nsaa: string;
  action: ActionKind;
  support: string;
};

const ROWS_2016_2019: readonly OverlapRow[] = [
  {
    engaa: "ENGAA Section 1 Part A",
    relationship: "Same questions",
    nsaa: "Section 1 Maths and Physics",
    action: "skip",
    support:
      "Skip this if you have completed the same year's NSAA Maths and Physics.",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    relationship: "Mostly overlaps",
    nsaa: "Section 1 Part E",
    action: "unique",
    support: "Complete only the fresh ENGAA questions listed below.",
  },
  {
    engaa: "ENGAA Section 2",
    relationship: "Unique to ENGAA",
    nsaa: "No direct duplicate",
    action: "optional",
    support: "Extra harder Physics practice, but less similar to the ESAT.",
  },
];

const ROWS_2020_2023: readonly OverlapRow[] = [
  {
    engaa: "ENGAA Section 1 Part A",
    relationship: "Same questions",
    nsaa: "Section 1 Maths and Physics",
    action: "skip",
    support: "Skip this if you have completed the same year's NSAA.",
  },
  {
    engaa: "ENGAA Section 1 Part B",
    relationship: "Unique to ENGAA",
    nsaa: "No NSAA Part E",
    action: "complete",
    support: "Do all relevant questions for Maths 2 and extra Physics.",
  },
  {
    engaa: "ENGAA Section 2",
    relationship: "Same Physics set",
    nsaa: "Section 2 Part X",
    action: "skip",
    support: "Complete either the ENGAA or NSAA copy, not both.",
  },
];

function ActionPill({ action }: { action: ActionKind }) {
  const labels: Record<ActionKind, string> = {
    skip: "Skip",
    unique: "Unique questions only",
    complete: "Complete",
    optional: "Optional",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
        action === "skip"
          ? `bg-error ${ON_SOLID_SUBJECT_TEXT}`
          : "bg-white/15 text-white",
      )}
    >
      {labels[action]}
    </span>
  );
}

function RelationshipRow({ row }: { row: OverlapRow }) {
  return (
    <article className="relative rounded-xl bg-white/[0.07] px-4 py-4 pr-28 sm:px-5 sm:py-5 sm:pr-36">
      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <ActionPill action={row.action} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)] lg:items-start lg:gap-5">
        <p className="text-base font-bold text-white sm:text-lg">{row.engaa}</p>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-[15px] font-semibold text-white sm:text-base">
              {row.relationship}
            </span>
            <ArrowRight
              aria-hidden
              className="h-4 w-4 shrink-0 text-white/70"
              strokeWidth={2.5}
            />
            <span className="text-[15px] text-[#E2E8F0] sm:text-base">
              <span className="text-[#94A3B8]">NSAA: </span>
              {row.nsaa}
            </span>
          </div>
          <p className={BODY}>{row.support}</p>
        </div>
      </div>
    </article>
  );
}

function EraBlock({
  years,
  rows,
}: {
  years: string;
  rows: readonly OverlapRow[];
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-base font-bold uppercase tracking-widest text-white sm:text-lg">
        {years}
      </h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <RelationshipRow key={row.engaa} row={row} />
        ))}
      </div>
    </section>
  );
}

function UniquePartBTable() {
  const years = Object.entries(UNIQUE_ENGAA_PART_B_BY_YEAR);

  return (
    <section
      id={UNIQUE_TABLE_ID}
      className="scroll-mt-28 rounded-2xl bg-white/[0.06] px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
    >
      <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Unique ENGAA Part B Questions
      </h3>
      <p className={cn("mt-3 max-w-3xl", BODY)}>
        If you have already completed NSAA Part E, these are the only ENGAA Part
        B questions from 2016-2019 that you need.
      </p>

      {/* Desktop / tablet table */}
      <div className="mt-8 hidden overflow-hidden rounded-xl bg-black/20 sm:block">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="bg-white/[0.06]">
              <th className="w-28 px-5 py-4 font-mono text-sm font-bold uppercase tracking-wide text-[#E2E8F0]">
                Year
              </th>
              <th className="px-5 py-4 text-sm font-bold uppercase tracking-wide text-[#E2E8F0]">
                Unique question numbers
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map(([year, questions], index) => (
              <tr
                key={year}
                className={cn(
                  index % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.07]",
                )}
              >
                <td className="px-5 py-5 align-middle font-mono text-base font-bold text-white">
                  {year}
                </td>
                <td className="px-5 py-5 align-middle">
                  <div className="flex flex-wrap gap-2">
                    {questions.map((q) => (
                      <span
                        key={q}
                        className="inline-flex rounded-full bg-white/15 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-white"
                      >
                        Q{q}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile year cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {years.map(([year, questions]) => (
          <div
            key={year}
            className="rounded-xl bg-black/25 px-4 py-4"
          >
            <p className="font-mono text-base font-bold text-white">{year}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {questions.map((q) => (
                <span
                  key={q}
                  className="inline-flex rounded-full bg-accent/20 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-accent"
                >
                  Q{q}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-sm text-[#94A3B8]">
        Question numbers refer to the ENGAA paper.
      </p>

      <div className="mt-8 rounded-xl bg-white/[0.05] px-4 py-5 sm:px-5">
        <p className="text-base font-bold text-white sm:text-lg">
          Need an exact question-by-question comparison?
        </p>
        <p className={cn("mt-2", BODY)}>
          Open the full overlap checker to see where every repeated question
          appears.
        </p>
        <Link
          href={SEO_ROUTES.engaaNsaaPapers}
          className="mt-4 inline-flex items-center rounded-full bg-maths px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-maths/90"
        >
          Open full overlap checker
        </Link>
      </div>
    </section>
  );
}

export function OverlapExplorerSection() {
  return (
    <div className="space-y-10">
      <div className="w-full space-y-4">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          NSAA and ENGAA Overlaps
        </h2>
        <p className={cn("max-w-3xl", BODY)}>
          NSAA and ENGAA reuse many of the same questions. If you have already
          completed NSAA, use this guide to avoid repeating them in ENGAA.
        </p>

        <div className="rounded-2xl bg-accent/15 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-base font-bold text-white sm:text-lg">
            Already completed NSAA?
          </p>
          <p className={cn("mt-2", BODY)}>
            Skip ENGAA Part A. Use Part B for Maths 2 and extra Physics. From
            2020 onwards, complete only one copy of Section 2 Physics.
          </p>
          <a
            href={`#${UNIQUE_TABLE_ID}`}
            className="mt-4 inline-flex items-center rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            View unique Part B questions
          </a>
        </div>
      </div>

      <EraBlock years="2016-2019" rows={ROWS_2016_2019} />

      <div className="rounded-2xl bg-white/[0.05] px-4 py-5 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          What changed in 2020?
        </p>
        <p className={cn("mt-2 max-w-3xl", BODY)}>
          NSAA removed Part E, so ENGAA Part B became fresh Maths 2 and Physics
          practice. ENGAA Section 2 also began reusing the NSAA Physics question
          set.
        </p>
      </div>

      <EraBlock years="2020-2023" rows={ROWS_2020_2023} />

      <div className="pt-6">
        <UniquePartBTable />
      </div>
    </div>
  );
}
