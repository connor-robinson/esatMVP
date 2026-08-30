import type { DownloadExam } from "@/data/pastPapersDownload";
import {
  getEngaaCompactTables,
  getMainPageCompactTables,
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

  return <PastPaperCompactTableGrid tables={getMainPageCompactTables()} />;
}
