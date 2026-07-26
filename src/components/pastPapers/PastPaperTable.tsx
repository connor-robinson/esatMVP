import { cn } from "@/lib/utils";
import type { PastPaperResource } from "@/content/pastPapers";
import { RelevanceBadge } from "./RelevanceBadge";

function Pdf({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return <span className="text-[#64748B]">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="font-semibold text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
    >
      {label}
    </a>
  );
}

/**
 * Dense listing of official resources. Scrolls sideways on narrow screens rather
 * than squashing the link columns.
 */
export function PastPaperTable({
  papers,
  caption,
  className,
}: {
  papers: readonly PastPaperResource[];
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={cn("m-0", className)}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[40rem] overflow-hidden rounded-2xl bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                {[
                  "Paper",
                  "Best for",
                  "ESAT relevance",
                  "Question paper",
                  "Answer key",
                  "Worked answers",
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-[#93C5FD]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {papers.map((paper, index) => (
                <tr
                  key={paper.id}
                  className={index % 2 === 1 ? "bg-white/[0.02]" : undefined}
                >
                  <th
                    scope="row"
                    className="px-4 py-3.5 text-left align-top font-semibold text-white"
                  >
                    {`${paper.paperName} ${paper.sectionName}`.trim()}
                  </th>
                  <td className="px-4 py-3.5 align-top text-[#94A3B8]">
                    {paper.bestForModules.length
                      ? paper.bestForModules.join(", ")
                      : "General reasoning"}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <RelevanceBadge relevance={paper.relevanceLevel} />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <Pdf href={paper.questionPaperUrl} label="Open" />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <Pdf href={paper.answerKeyUrl} label="Open" />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <Pdf href={paper.workedSolutionsUrl} label="Open" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm text-[#94A3B8]">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
