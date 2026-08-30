import Link from "next/link";
import type { PastPaperDownload } from "@/data/pastPapersDownload";
import { pastPaperPagePath } from "@/data/pastPapersDownload";
import { PastPaperDownloadButton } from "./PastPaperDownloadButton";

type Props = {
  papers: readonly PastPaperDownload[];
};

function DownloadCell({
  href,
  label,
  ariaLabel,
}: {
  href?: string;
  label: string;
  ariaLabel: string;
}) {
  if (!href) {
    return <span className="text-sm text-text-subtle">Not available</span>;
  }
  return (
    <PastPaperDownloadButton
      href={href}
      label={label}
      ariaLabel={ariaLabel}
      className="w-full sm:w-auto"
    />
  );
}

export function PastPaperDownloadTable({ papers }: Props) {
  if (papers.length === 0) {
    return (
      <p className="py-6 text-sm text-text-muted">No papers match these filters.</p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th scope="col" className="pb-3 pr-4 font-semibold text-text-muted">
                Paper
              </th>
              <th scope="col" className="pb-3 pr-4 font-semibold text-text-muted">
                Question paper
              </th>
              <th scope="col" className="pb-3 font-semibold text-text-muted">
                Answers
              </th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => (
              <tr
                key={paper.id}
                className="border-b border-border/40 transition-colors hover:bg-surface-elevated/50"
              >
                <th scope="row" className="py-3 pr-4 font-medium text-text">
                  <Link
                    href={pastPaperPagePath(paper)}
                    className="text-maths underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maths/50"
                  >
                    {paper.title}
                  </Link>
                </th>
                <td className="py-3 pr-4">
                  <DownloadCell
                    href={paper.paperUrl}
                    label="Question paper"
                    ariaLabel={`Download ${paper.title} question paper PDF`}
                  />
                </td>
                <td className="py-3">
                  <DownloadCell
                    href={paper.answersUrl}
                    label="Answers"
                    ariaLabel={`Download ${paper.title} answers PDF`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {papers.map((paper) => (
          <li
            key={paper.id}
            className="rounded-xl bg-surface-elevated/60 p-4"
          >
            <Link
              href={pastPaperPagePath(paper)}
              className="text-base font-semibold text-maths underline-offset-4 hover:underline"
            >
              {paper.title}
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <DownloadCell
                href={paper.paperUrl}
                label="Question paper"
                ariaLabel={`Download ${paper.title} question paper PDF`}
              />
              <DownloadCell
                href={paper.answersUrl}
                label="Answers"
                ariaLabel={`Download ${paper.title} answers PDF`}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
