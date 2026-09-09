import type { DownloadExam } from "@/data/pastPapersDownload";
import {
  getEngaaCompactTables,
  getMainPageCompactTables,
  getNsaaCompactTables,
} from "@/data/pastPapersDownload";
import { PastPaperCompactTableGrid } from "./PastPaperCompactTableGrid";
import { PastPaperLibraryPrefetch } from "./PastPaperLibraryPrefetch";

type Props = {
  exam?: DownloadExam;
};

export function PastPaperDownloadSections({ exam }: Props) {
  const tables =
    exam === "NSAA"
      ? getNsaaCompactTables()
      : exam === "ENGAA"
        ? getEngaaCompactTables()
        : getMainPageCompactTables();

  return (
    <>
      <PastPaperLibraryPrefetch />
      <PastPaperCompactTableGrid tables={tables} />
    </>
  );
}
