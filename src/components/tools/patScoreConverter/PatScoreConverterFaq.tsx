import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAT_REPORTS_INDEX_URL } from "@/lib/patScoreConverter/years";

export const PAT_SCORE_CONVERTER_FAQ_ITEMS = [
  {
    question: "What does the PAT score converter do?",
    answer:
      "It estimates where an Oxford PAT past-paper score sat in that year's applicant cohort. You choose a historical PAT year, enter a score out of 100, and the tool reports the official published mean, standard deviation and any PAT-only shortlisting mark for that sitting. Where Oxford published enough data, it also estimates a historical percentile. If that percentile can be estimated, the converter then finds the ESAT Physics score at the same percentile. That last figure is a rough percentile-equivalent for practice, not an official PAT to ESAT conversion.",
  },
  {
    question: "What was a good PAT score?",
    answer:
      "It depended on the year. Oxford's published means moved a long way: about 41% in 2019, 43% in 2021, 51% in 2022 and 56% in 2023. Automatic shortlisting marks, when Oxford published a PAT-only cut-off, also moved: 59 in 2017, 62 in 2018, 63 in 2021 and 68 in 2022. A score that was strong in a hard year could be typical in an easier one, so the year matters more than a single 'good score' rule.",
  },
  {
    question: "Did PAT difficulty change between years?",
    answer:
      "Yes. Oxford has said the paper is written to a similar intended difficulty, but the realised difficulty is only known after candidates sit it. Means and spreads changed with that, and with format changes: MCQs were removed in 2015, returned in 2017, calculators were allowed from 2018, 2023 moved online, and 2024 became MCQ-only. Raw percentages from different PAT years are not directly comparable.",
  },
  {
    question: "Can a PAT score be converted to ESAT Physics?",
    answer:
      "Not officially. PAT and ESAT are different tests, with different cohorts, formats and scoring. Where this tool can estimate a historical PAT percentile, it looks up the ESAT Physics score at the same percentile on the current official ESAT Physics distribution. Treat that as a practice-context percentile-equivalent only. It is not an official PAT to ESAT conversion, and Oxford will not use it for admissions.",
  },
  {
    question: "Why is the ESAT estimate only approximate?",
    answer:
      "The ESAT figure is a percentile match, not a raw-mark translation. It assumes that sitting at the 70th percentile of a historical PAT cohort is loosely comparable to sitting at the 70th percentile of the current ESAT Physics cohort. The tests cover overlapping physics and maths, but they are not the same paper, the candidate pools differ, and PAT itself changed format several times. Small differences in PAT percentile also map onto a coarse ESAT 1.0-9.0 scale.",
  },
  {
    question: "What format changes happened in PAT?",
    answer:
      "Before 2015 the paper mixed multiple-choice and longer written questions. MCQs were removed in 2015, then reintroduced in 2017. Calculators were allowed from 2018. 2023 was delivered online. From 2024 the PAT was MCQ-only, sat online, with an on-screen calculator. Oxford Physics now requires ESAT, and Oxford does not intend to keep releasing new PAT papers in the same way.",
  },
  {
    question: "Where does the historical data come from?",
    answer:
      "Mean, standard deviation, range and shortlisting figures come from University of Oxford Department of Physics admissions reports, formerly PAT reports. Each year in the table cites the matching report. Percentiles are estimated from those official cohort statistics. Oxford published score histograms as graphs rather than tabulated bins, so this converter does not invent histogram counts. ESAT Physics percentiles use the same official cumulative table as the main ESAT Camp score converter. Prep-site claims are not used as historical data when Oxford figures exist.",
  },
] as const;

export function PatScoreConverterFaq({
  className,
  id,
}: {
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mt-10", className)}>
      <div className="rounded-organic-xl bg-surface-elevated p-5 shadow-modal-card sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
          Frequently asked questions
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Year-specific PAT percentiles, format changes, and why the ESAT Physics
          figure is only a percentile-equivalent.
        </p>

        <div className="mt-5 space-y-2">
          {PAT_SCORE_CONVERTER_FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group rounded-organic-lg bg-surface-mid/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-text">
                <span>{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-text-muted">
                {item.answer}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-text-subtle">
          Oxford reports:{" "}
          <a
            href={PAT_REPORTS_INDEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            Physics admissions reports
          </a>
        </p>
      </div>
    </section>
  );
}
