import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAT_ARCHIVE_URL } from "@/lib/matScoreConverter/years";

export const MAT_SCORE_CONVERTER_FAQ_ITEMS = [
  {
    question: "What does the MAT score converter do?",
    answer:
      "It places an Oxford MAT past-paper score in context using official Mathematical Institute averages for that year. You choose a MAT year from 2007 to 2025, enter a score out of 100, and see µ1 (all applicants), µ2 (shortlisted) and µ3 (offer holders) for Oxford Maths, Maths & Statistics, and Maths & Philosophy. Where Oxford published a usable score distribution, the tool also estimates a historical percentile and looks up the TMUA score at the same percentile on the latest official UAT-UK TMUA table. That last figure is a percentile-equivalent for practice, not an official MAT to TMUA conversion.",
  },
  {
    question: "What was the MAT scored out of?",
    answer:
      "MAT was scored out of 100. Maths / Maths & Statistics / Maths & Philosophy applicants answered questions 1-5. Computer Science applicants sat a different question mix on the same paper. This converter uses the Maths-group averages Oxford publishes for those courses.",
  },
  {
    question: "What was a good MAT score?",
    answer:
      "It depended on the year. All-applicant averages ranged from the mid-40s in some sittings (for example 43.7 in 2015 and 44.9 in 2019) to the high 50s in others (58.7 in 2008, 57.9 in 2020). Shortlisted averages were typically in the mid-60s to mid-70s, and offer-holder averages often sat in the high 60s to low 80s. A score that looked strong in a hard year could be typical in an easier one, so compare against that year's published averages rather than a single 'good score' rule.",
  },
  {
    question: "Why did MAT scores vary by year?",
    answer:
      "Paper difficulty, applicant mix and format all moved. Oxford updated the syllabus for 2018, 2023 had major technical disruption plus an extra test for affected candidates, and 2024/2025 used Pearson VUE online delivery. Raw marks from different years are not directly comparable, which is why this tool keeps each year separate.",
  },
  {
    question: "Can MAT scores be converted to TMUA?",
    answer:
      "Not officially. Oxford replaced MAT with TMUA for Mathematics and Computer Science from the 2026 cycle, but there is no official score translation. Where this tool can estimate a historical MAT percentile from a published distribution, it finds the TMUA score at the same percentile on the latest official TMUA cumulative table. Treat that as a practice-context percentile-equivalent only. MAT and TMUA cover similar topics and both emphasise problem solving, but they are not identical tests.",
  },
  {
    question: "Did the MAT format change?",
    answer:
      "Yes. The syllabus was updated for 2018. 2023 had technical disruption and an additional multiple-choice-style test before shortlisting for affected candidates. 2024 and 2025 used online delivery; the 2025 paper had 25 multiple-choice questions plus two longer typed questions, still marked out of 100. 2025 was the final MAT year.",
  },
  {
    question: "Why did Oxford replace MAT with TMUA?",
    answer:
      "From the 2026 admissions cycle, Oxford Mathematics and Computer Science courses require TMUA instead of MAT. TMUA is run by UAT-UK and used by several universities, so applicants can sit one maths admissions test for multiple destinations. Past MAT papers remain useful practice for mathematical problem solving, but new Oxford applicants for those courses should prepare for TMUA.",
  },
  {
    question: "Where does the data come from?",
    answer:
      "µ1 / µ2 / µ3 averages come from University of Oxford Mathematical Institute MAT feedback reports and the past-paper archive. Oxford publishes outcome-by-score charts as graphs rather than tabulated bins, so this converter does not invent histogram counts for percentile estimates. When tabulated bins are available, percentiles use transparent interpolation. TMUA percentile matching uses the same official post-change cumulative table as other ESAT Camp tools. Prep-site claims are not used as historical data when Oxford figures exist.",
  },
] as const;

export function MatScoreConverterFaq({
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
          MAT averages, format changes, and why any TMUA figure is only a
          percentile-equivalent.
        </p>

        <div className="mt-5 space-y-2">
          {MAT_SCORE_CONVERTER_FAQ_ITEMS.map((item) => (
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
          Oxford MAT archive:{" "}
          <a
            href={MAT_ARCHIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            Mathematical Institute past papers and feedback
          </a>
        </p>
      </div>
    </section>
  );
}
