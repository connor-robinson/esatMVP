import { cn } from "@/lib/utils";
import type { PastPaperResource } from "@/content/pastPapers";
import { MappingStatusBadge } from "./MappingStatusBadge";
import { RelevanceBadge } from "./RelevanceBadge";

function PaperLink({
  href,
  children,
  strong = false,
}: {
  href: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors",
        strong
          ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          : "bg-white/[0.08] text-white hover:bg-white/[0.14]",
      )}
    >
      {children}
      <span aria-hidden className="text-xs opacity-70">
        PDF
      </span>
    </a>
  );
}

/** One official resource: what it is, what it suits, and the official links. */
export function PastPaperCard({
  paper,
  className,
}: {
  paper: PastPaperResource;
  className?: string;
}) {
  const heading = `${paper.paperName} ${paper.sectionName}`.trim();

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-display font-bold text-white">{heading}</h3>
        <RelevanceBadge relevance={paper.relevanceLevel} />
      </div>

      {paper.bestForModules.length ? (
        <p className="mt-3 text-sm text-[#94A3B8]">
          <span className="font-semibold text-white">Best for: </span>
          {paper.bestForModules.join(", ")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[#94A3B8]">
          <span className="font-semibold text-white">Best for: </span>
          general reasoning practice rather than a specific ESAT module
        </p>
      )}

      <p className="mt-3 flex-1 text-sm leading-relaxed text-[#94A3B8]">
        {paper.notes}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <PaperLink href={paper.questionPaperUrl} strong>
          Question paper
        </PaperLink>
        {paper.answerKeyUrl ? (
          <PaperLink href={paper.answerKeyUrl}>Answer key</PaperLink>
        ) : null}
        {paper.workedSolutionsUrl ? (
          <PaperLink href={paper.workedSolutionsUrl}>Worked answers</PaperLink>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <MappingStatusBadge status={paper.mappingStatus} />
        <a
          href={paper.officialSourcePage}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-xs text-[#94A3B8] underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-[#3B82F6]"
        >
          Official source page
        </a>
      </div>
    </article>
  );
}
