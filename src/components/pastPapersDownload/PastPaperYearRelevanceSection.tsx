import {
  getDownloadYears,
  papersByExam,
  type DownloadExam,
} from "@/data/pastPapersDownload";
import { SeoSection } from "@/components/seo/SeoSections";

function sectionSummary(exam: DownloadExam, year: number): string {
  const papers = papersByExam(exam).filter((paper) => paper.year === year);
  const sections = [...new Set(papers.map((paper) => paper.section))].sort();
  if (sections.length === 0) return "";
  if (sections.length === 1) {
    return `Download ${exam} ${year} ${sections[0]} paper and answer key above.`;
  }
  return `Download ${exam} ${year} Section 1 and Section 2 papers and answer keys above.`;
}

function ExamYearBlock({ exam }: { exam: DownloadExam }) {
  const years = getDownloadYears(papersByExam(exam));

  return (
    <SeoSection heading={`${exam} past papers by year`}>
      <ul className="space-y-4">
        {years.map((year) => (
          <li key={year}>
            <p className="font-semibold text-white">
              {exam} {year} past papers
            </p>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-[#94A3B8]">
              {sectionSummary(exam, year)}
            </p>
          </li>
        ))}
      </ul>
    </SeoSection>
  );
}

export function PastPaperYearRelevanceSection() {
  return (
    <>
      <ExamYearBlock exam="NSAA" />
      <ExamYearBlock exam="ENGAA" />
    </>
  );
}
