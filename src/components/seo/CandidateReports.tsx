import {
  getConsentedCandidateReports,
  type EsatCandidateReport,
} from "@/content/esatCandidateReports";
import { SeoSection, SeoSubheading } from "@/components/seo/SeoSections";

/**
 * Renders other-candidate reports only when at least one consented entry exists.
 * Architecture is ready; the section stays hidden until real contributions land.
 */
export function CandidateReports() {
  const reports = getConsentedCandidateReports();
  if (reports.length === 0) return null;

  return (
    <SeoSection heading="Reports from other ESAT candidates">
      <ul className="space-y-6">
        {reports.map((report) => (
          <CandidateReportItem key={`${report.name}-${report.testYear}-${report.centre}`} report={report} />
        ))}
      </ul>
    </SeoSection>
  );
}

function CandidateReportItem({ report }: { report: EsatCandidateReport }) {
  return (
    <li className="rounded-2xl bg-white/[0.04] p-5">
      <SeoSubheading>
        {report.name}, {report.testYear}
      </SeoSubheading>
      <p className="mt-1 text-sm text-[#64748B]">
        Pearson VUE, {report.centre}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
        Rough work: {report.roughWorkSetup}
      </p>
      <blockquote className="mt-4 text-sm leading-relaxed text-[#CBD5E1]">
        “{report.quote}”
      </blockquote>
    </li>
  );
}
