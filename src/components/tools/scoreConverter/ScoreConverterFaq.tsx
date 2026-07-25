import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqItem = { question: string; answer: string };

/**
 * Rendered on `/tools/score-converter` and mirrored into FAQPage structured
 * data by that page, so both must stay in sync.
 */
export const SCORE_CONVERTER_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is the ESAT scored out of 9?",
    answer:
      "ESAT module results are reported on a 1.0 to 9.0 scale to one decimal place. You receive a separate score for each module you sit.",
  },
  {
    question: "Why does the same raw mark not always mean the same score?",
    answer:
      "The scale depends on the ability distribution of the cohort and the test version. That is also why official sample tests do not award a scaled score.",
  },
  {
    question: "Should I use the converter before or after practice?",
    answer:
      "Both. Use it after timed sets to understand your approximate position, then use the calibration test to decide what to practise next.",
  },
  {
    question: "What changed with TMUA in 2024?",
    answer:
      "From 2024, TMUA administration moved to UAT-UK and Pearson VUE. Candidates sit different test versions on different dates, and each person's score is calculated with a Rasch IRT statistical model rather than a single published raw-marks-to-score table. The 1.0–9.0 scale was also recalibrated — a typical score dropped from around 5.1 to around 3.8, and university grade boundaries moved down by a similar amount. The test did not suddenly get harder; the ruler changed.",
  },
  {
    question: "Why can't I convert TMUA 2024+ from raw marks?",
    answer:
      "UAT-UK does not publish raw-to-scaled conversion tables for the IRT era. For 2024 and later papers, enter the scaled score printed on your score report (1.0–9.0). We place that score on the current official distribution to estimate your percentile.",
  },
  {
    question: "How do you convert NSAA and ENGAA raw marks?",
    answer:
      "We look up your raw mark in the official conversion table for that exam year and section, stored in our database from Cambridge's published data. Each table maps raw scores to the 1.0–9.0 scaled score used on that paper. If a year's table is missing for a section, we use the nearest available year and flag it in the results.",
  },
  {
    question: "How do you convert TMUA marks before 2024?",
    answer:
      "For TMUA 2023 and earlier, we use the same official raw-to-scaled tables (sourced from Cambridge FOI disclosures and cross-checked against independent republications). Enter separate marks for Mathematical Thinking and Mathematical Reasoning together, or one combined overall score across both papers — but not a mix of those modes, because they use different scoring units.",
  },
  {
    question: "What is the estimated post-2024 TMUA score?",
    answer:
      "For pre-2024 TMUA papers we show two figures: the score you would actually have received that year, and an estimate of the equivalent on today's scale. The estimate works by finding your percentile rank on the old TMUA distribution, then reading off the score with the same percentile on the post-2024 distribution. It is a percentile-matched proxy, not an official UAT-UK conversion. Comparisons are most reliable at 7.0+; the middle band (roughly 4.0–6.5 on the new scale) is less stable.",
  },
  {
    question: "How are percentiles calculated?",
    answer:
      'We use official cumulative score distributions — CSV tables of scaled score versus "% of candidates at or below this score". Your scaled score is interpolated between the nearest published points to estimate your cumulative percentile. "Top X%" is simply 100 minus that cumulative percentile (e.g. 85th percentile → top 15%). NSAA and ENGAA use subject-specific ESAT distributions; TMUA uses separate pre- and post-2024 cumulative tables.',
  },
  {
    question: "Where does the data come from?",
    answer:
      "Raw-to-scaled conversion tables come from Cambridge Assessment admissions data (and FOI disclosures for TMUA). Percentile distributions come from official ESAT and TMUA cumulative tables. We do not invent conversion numbers — everything is traced to published or disclosed source material, with gaps filled from the nearest reliable year when necessary.",
  },
  {
    question: "Is this an official ESAT or TMUA score?",
    answer:
      "No. This tool is a historical proxy for understanding how past papers relate to today's admissions landscape. It is useful for comparing mock performance and calibrating expectations, but it is not a score Cambridge, UAT-UK, or any university will use for an application.",
  },
];

export function ScoreConverterFaq({ className }: { className?: string }) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="rounded-organic-xl bg-surface-elevated p-5 shadow-modal-card sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
          Frequently asked questions
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          How the new TMUA system works, how we convert scores, and where percentiles come from.
        </p>

        <div className="mt-5 space-y-2">
          {SCORE_CONVERTER_FAQ_ITEMS.map((item) => (
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
      </div>
    </section>
  );
}
