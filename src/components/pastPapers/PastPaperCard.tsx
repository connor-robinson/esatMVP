import { cn } from "@/lib/utils";
import type { EsatModule, PastPaperResource } from "@/content/pastPapers";

function PaperLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-sm text-[#94A3B8] transition-colors hover:text-white"
    >
      {children}
    </a>
  );
}

function shortModule(module: EsatModule) {
  return module.replace("Mathematics ", "Maths ");
}

function commentary(paper: PastPaperResource) {
  if (paper.exam === "ENGAA") {
    return "Part A is maths and physics. Part B is the advanced stuff. Same-year NSAA repeats a lot of this.";
  }
  if (paper.exam === "NSAA") {
    if (paper.year !== null && paper.year >= 2020) {
      return "Chem and bio live here. No advanced section, so Maths 2 is ENGAA. Maths and physics overlap with that year's ENGAA.";
    }
    return "Chem and bio live here. Part E is extra Maths 2. Maths and physics overlap with that year's ENGAA.";
  }
  if (paper.sectionName === "Paper 2") {
    return paper.year === null
      ? "Undated Paper 2. Logic and proof — skip unless you like that."
      : "Logic and proof. Not ESAT. Skip unless you like that.";
  }
  if (paper.year === null) {
    return "Undated extra Maths 2. Use after the dated papers.";
  }
  return "Extra Maths 2. Slower than ESAT. Worked answers are the reason to open it.";
}

/** One official resource as a list row. Notes stay collapsed unless you want them. */
export function PastPaperCard({
  paper,
  className,
}: {
  paper: PastPaperResource;
  className?: string;
}) {
  const heading = `${paper.paperName} ${paper.sectionName}`.trim();
  const bestFor = paper.bestForModules.length
    ? paper.bestForModules.map(shortModule).join(" · ")
    : "Not a specific ESAT module";

  return (
    <article className={cn("py-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-white sm:text-lg">
            {heading}
          </h4>
          <p className="mt-1 text-sm text-[#64748B]">{bestFor}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
          <PaperLink href={paper.questionPaperUrl}>Paper</PaperLink>
          {paper.answerKeyUrl ? (
            <PaperLink href={paper.answerKeyUrl}>Answers</PaperLink>
          ) : null}
          {paper.workedSolutionsUrl ? (
            <PaperLink href={paper.workedSolutionsUrl}>Worked</PaperLink>
          ) : null}
        </div>
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-sm text-[#64748B] transition-colors hover:text-[#94A3B8] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Notes</span>
          <span className="hidden group-open:inline">Hide notes</span>
        </summary>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748B]">
          {commentary(paper)}
          {paper.notes ? ` ${paper.notes}` : null}
        </p>
        <p className="mt-2">
          <a
            href={paper.officialSourcePage}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-xs text-[#64748B] underline decoration-white/10 underline-offset-4 hover:text-[#94A3B8]"
          >
            Official source
          </a>
        </p>
      </details>
    </article>
  );
}
