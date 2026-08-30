import type { DownloadExam } from "@/data/pastPapersDownload";
import {
  getEngaaCompactTables,
  getNsaaCompactTables,
} from "@/data/pastPapersDownload";
import { PastPaperCompactTableGrid } from "./PastPaperCompactTableGrid";

type Props = {
  exam?: DownloadExam;
};

export function PastPaperDownloadSections({ exam }: Props) {
  if (exam === "NSAA") {
    return <PastPaperCompactTableGrid tables={getNsaaCompactTables()} />;
  }

  if (exam === "ENGAA") {
    return <PastPaperCompactTableGrid tables={getEngaaCompactTables()} />;
  }

  return (
    <div className="space-y-10">
      <PastPaperCompactTableGrid title="NSAA" tables={getNsaaCompactTables()} />
      <PastPaperCompactTableGrid title="ENGAA" tables={getEngaaCompactTables()} />
    </div>
  );
}
