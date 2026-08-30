import type { DownloadExam } from "@/data/pastPapersDownload";
import { getPastPaperSectionGroups } from "@/data/pastPapersDownload";
import { SeoSection } from "@/components/seo/SeoSections";
import { PastPaperDownloadRow } from "./PastPaperDownloadRow";

type Props = {
  exam?: DownloadExam;
};

export function PastPaperDownloadSections({ exam }: Props) {
  const groups = getPastPaperSectionGroups(exam ? { exam } : undefined);

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <SeoSection key={`${group.exam}-${group.section}`} heading={group.heading}>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {group.papers.map((paper) => (
              <PastPaperDownloadRow key={paper.id} paper={paper} />
            ))}
          </ul>
        </SeoSection>
      ))}
    </div>
  );
}
