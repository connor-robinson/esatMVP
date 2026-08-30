import Link from "next/link";
import type { PastPaperDownload } from "@/data/pastPapersDownload";
import { pastPaperPagePath } from "@/data/pastPapersDownload";
import { PastPaperDownloadButton } from "./PastPaperDownloadButton";

type Props = {
  paper: PastPaperDownload;
  answersLabel?: string;
};

export function PastPaperDownloadRow({
  paper,
  answersLabel = "Answer key",
}: Props) {
  return (
    <li className="flex flex-col gap-3 border-b border-white/[0.06] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={pastPaperPagePath(paper)}
        className="text-base font-semibold text-white transition-colors hover:text-[#3B82F6]"
      >
        {paper.title}
      </Link>
      <div className="flex flex-wrap gap-2">
        <PastPaperDownloadButton
          href={paper.paperUrl}
          label="Past paper"
          ariaLabel={`Download ${paper.title} question paper PDF`}
        />
        {paper.answersUrl ? (
          <PastPaperDownloadButton
            href={paper.answersUrl}
            label={answersLabel}
            ariaLabel={`Download ${paper.title} ${answersLabel.toLowerCase()} PDF`}
          />
        ) : (
          <span className="self-center px-1 text-sm text-[#64748B]">
            {answersLabel} not available
          </span>
        )}
      </div>
    </li>
  );
}
